import { BigNumber, ethers } from "ethers";
import { config, HandleTokenManager, HlpConfig } from "../../..";
import { Router__factory } from "../../../contracts";
import { getSwapFeeBasisPoints } from "../../Trade";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { HLP_SWAP_WEIGHT, WeightInput } from "./weights";
import { fetchEncodedSignedQuotes } from "../../../utils/h2so-utils";
import { pairFromString } from "../../../utils/general-utils";
import { isDisabledOnWeekends, isTradeWeekend } from "../../../utils/trade-utils";

const hlpSwapWeight = async (input: WeightInput): Promise<number> => {
  if (isTradeWeekend() && isDisabledOnWeekends(input.fromToken, input.toToken)) {
    return 0;
  }

  const routerAddress = HlpConfig.HLP_CONTRACTS[input.network]?.Router;
  const tokenManager = new HandleTokenManager();
  const isToTokenValid =
    tokenManager.isHlpTokenBySymbol(input.toToken.symbol, input.network) ||
    input.toToken.extensions?.isNative;
  const isFromTokenValid =
    tokenManager.isHlpTokenBySymbol(input.fromToken.symbol, input.network) ||
    input.fromToken.extensions?.isNative;
  if (routerAddress && isToTokenValid && isFromTokenValid && input.hasHlpMethods) {
    return HLP_SWAP_WEIGHT;
  }
  return 0;
};

const hlpSwapQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  const { network, fromToken, toToken, hlpMethods, sellAmount: fromAmount } = input;
  const routerAddress = HlpConfig.HLP_CONTRACTS[network]?.Router;

  if (!routerAddress) throw new Error(`Network ${network} does not have a Router contract`);
  if (!hlpMethods) throw new Error("hlpMethods is required for a hlpSwap quote");
  if (!input.hlpConfig) throw new Error("hLP config is required for this route");

  const tokenManager = new HandleTokenManager();

  // Parse ETH address into WETH address.
  const { hlpAddress: parsedFromTokenAddress } = tokenManager.checkForHlpNativeToken(fromToken);
  const { hlpAddress: parsedToTokenAddress } = tokenManager.checkForHlpNativeToken(toToken);

  const priceIn = hlpMethods.getMinPrice(parsedFromTokenAddress);
  const priceOut = hlpMethods.getMaxPrice(parsedToTokenAddress);

  const amountOut = fromAmount.mul(priceIn).div(priceOut.isZero() ? 1 : priceOut);

  const feeBasisPoints = getSwapFeeBasisPoints({
    tokenIn: parsedFromTokenAddress,
    tokenOut: parsedToTokenAddress,
    usdHlpDelta: priceIn
      .mul(fromAmount)
      .mul(ethers.utils.parseUnits("1", 18))
      .div(ethers.utils.parseUnits("1", HlpConfig.PRICE_DECIMALS))
      .div(ethers.utils.parseUnits("1", fromToken.decimals)),
    usdHlpSupply: hlpMethods.getUsdHlpSupply(),
    totalTokenWeights: hlpMethods.getTotalTokenWeights(),
    targetUsdHlpAmount: hlpMethods.getTargetUsdHlpAmount(parsedFromTokenAddress),
    config: input.hlpConfig
  });

  return {
    allowanceTarget: routerAddress,
    buyAmount: amountOut.toString(),
    sellAmount: fromAmount.toString(),
    gas: config.convert.gasEstimates.hlp,
    feeBasisPoints: feeBasisPoints.toNumber(),
    feeChargedBeforeConvert: false
  };
};

const hlpSwapTransactionHandler = async (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  const {
    network,
    receivingAccount: connectedAccount,
    signer,
    fromToken,
    toToken,
    buyAmount,
    slippage,
    sellAmount
  } = input;
  const router = Router__factory.connect(
    HlpConfig.HLP_CONTRACTS[network]?.Router ?? ethers.constants.AddressZero,
    signer
  );
  const tokenManager = new HandleTokenManager();
  const { hlpAddress: fromAddress, isNative: isFromNative } =
    tokenManager.checkForHlpNativeToken(fromToken);
  const { hlpAddress: toAddress, isNative: isToNative } =
    tokenManager.checkForHlpNativeToken(toToken);

  const buyAmountWithTolerance = BigNumber.from(buyAmount)
    .mul(HlpConfig.BASIS_POINTS_DIVISOR - slippage * 100)
    .div(HlpConfig.BASIS_POINTS_DIVISOR);

  const encodedSignedQuotes = await fetchEncodedSignedQuotes([
    pairFromString(`${fromToken.symbol}/USD`),
    pairFromString(`${toToken.symbol}/USD`)
  ]);

  if (!isFromNative && !isToNative) {
    return router.populateTransaction.swap(
      [fromAddress, toAddress],
      sellAmount,
      buyAmountWithTolerance,
      connectedAccount,
      encodedSignedQuotes.encoded
    );
  }

  if (isFromNative) {
    return router.populateTransaction.swapETHToTokens(
      [fromAddress, toAddress],
      buyAmountWithTolerance,
      connectedAccount,
      encodedSignedQuotes.encoded,
      { value: sellAmount }
    );
  }

  return router.populateTransaction.swapTokensToETH(
    [fromAddress, toAddress],
    sellAmount,
    buyAmountWithTolerance,
    connectedAccount,
    encodedSignedQuotes.encoded
  );
};

export default {
  weight: hlpSwapWeight,
  quote: hlpSwapQuoteHandler,
  transaction: hlpSwapTransactionHandler
};
