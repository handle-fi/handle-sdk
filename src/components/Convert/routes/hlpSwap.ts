import { BigNumber, ethers } from "ethers";
import { config, HandleTokenManager, HlpConfig } from "../../..";
import { Router__factory } from "../../../contracts";
import { getSwapFeeBasisPoints } from "../../Trade";
import { ConvertQuoteInput, ConvertTransactionInput, Quote } from "../Convert";
import { HLP_SWAP_WEIGHT, WeightInput } from "./weights";

const hlpSwapWeight = async (input: WeightInput): Promise<number> => {
  const routerAddress = HlpConfig.HLP_CONTRACTS[input.network]?.Router;
  const tokenManager = new HandleTokenManager();
  if (
    routerAddress &&
    tokenManager.isHlpTokenBySymbol(input.toToken.symbol, input.network) &&
    tokenManager.isHlpTokenBySymbol(input.fromToken.symbol, input.network)
  ) {
    return HLP_SWAP_WEIGHT;
  }
  return 0;
};

const hlpSwapQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  const { network, fromToken, toToken, hlpMethods, fromAmount } = input;
  const routerAddress = HlpConfig.HLP_CONTRACTS[network]?.Router;

  if (!routerAddress) throw new Error(`Network ${network} does not have a Router contract`);
  if (!hlpMethods) throw new Error("hlpMethods is required for a hlpSwap quote");
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
    getTokenInfo: hlpMethods.getTokenInfo
  });

  return {
    allowanceTarget: routerAddress,
    buyAmount: amountOut.toString(),
    sellAmount: fromAmount.toString(),
    gas: config.convert.gasEstimates.hlp,
    feeBasisPoints: feeBasisPoints.toNumber()
  };
};

const hlpSwapTransactionHandler = async (
  input: ConvertTransactionInput
): Promise<ethers.PopulatedTransaction> => {
  const { network, connectedAccount, signer, fromToken, toToken, buyAmount, slippage, sellAmount } =
    input;
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

  if (!isFromNative && !isToNative) {
    return router.populateTransaction.swap(
      [fromAddress, toAddress],
      sellAmount,
      buyAmountWithTolerance,
      connectedAccount
    );
  }

  if (isFromNative) {
    return router.populateTransaction.swapETHToTokens(
      [fromAddress, toAddress],
      buyAmountWithTolerance,
      connectedAccount,
      { value: sellAmount }
    );
  }

  return router.populateTransaction.swapTokensToETH(
    [fromAddress, toAddress],
    sellAmount,
    buyAmountWithTolerance,
    connectedAccount
  );
};

export default {
  weight: hlpSwapWeight,
  quote: hlpSwapQuoteHandler,
  transaction: hlpSwapTransactionHandler
};
