import { BigNumber, ethers } from "ethers";
import { HlpConfig, HlpUtils } from "../../..";
import { Router__factory } from "../../../contracts";
import { tryParseNativeHlpToken } from "../../../utils/hlp";
import { getSwapFeeBasisPoints } from "../../Trade";
import { ConvertQuoteInput, ConvertTransactionInput, Quote } from "../Convert";
import { LIQUIDITY_WEIGHT, WeightInput } from "./weights";

const liquidityPoolWeight = async (input: WeightInput): Promise<number> => {
  const routerAddress = HlpConfig.HLP_CONTRACTS[input.network]?.Router;
  if (
    routerAddress &&
    HlpUtils.isHlpToken(input.toToken.symbol, input.network) &&
    HlpUtils.isHlpToken(input.fromToken.symbol, input.network)
  ) {
    return LIQUIDITY_WEIGHT;
  }
  return 0;
};

const liquidityPoolQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  const { network, fromToken, toToken, hlpMethods, fromAmount } = input;
  const routerAddress = HlpConfig.HLP_CONTRACTS[network]?.Router;

  if (!routerAddress) throw new Error(`Network ${network} does not have a Router contract`);
  if (!hlpMethods) throw new Error("hlpMethods is required for a liquidityPool quote");

  // Parse ETH address into WETH address.
  const { address: parsedFromTokenAddress } = tryParseNativeHlpToken(fromToken, network);
  const { address: parsedToTokenAddress } = tryParseNativeHlpToken(toToken, network);

  const priceIn = hlpMethods.getMinPrice(parsedFromTokenAddress);
  const priceOut = hlpMethods.getMaxPrice(parsedToTokenAddress);

  const amountOut = fromAmount.mul(priceIn).div(priceOut.isZero() ? 1 : priceOut);

  const feeBasisPoints = getSwapFeeBasisPoints({
    tokenIn: parsedFromTokenAddress,
    tokenOut: parsedToTokenAddress,
    usdgDelta: priceIn
      .mul(fromAmount)
      .mul(ethers.utils.parseUnits("1", 18))
      .div(ethers.utils.parseUnits("1", HlpConfig.PRICE_DECIMALS))
      .div(ethers.utils.parseUnits("1", fromToken.decimals)),
    usdgSupply: hlpMethods.getUsdgSupply(),
    totalTokenWeights: hlpMethods.getTotalTokenWeights(),
    targetUsdgAmount: hlpMethods.getTargetUsdgAmount(parsedFromTokenAddress),
    getTokenInfo: hlpMethods.getTokenInfo
  });

  return {
    allowanceTarget: routerAddress,
    buyAmount: amountOut.toString(),
    sellAmount: fromAmount.toString(),
    gas: HlpConfig.HLP_SWAP_GAS_LIMIT,
    feeBasisPoints: feeBasisPoints.toNumber()
  };
};

const liquidityPoolTransactionHandler = async (
  input: ConvertTransactionInput
): Promise<ethers.PopulatedTransaction> => {
  const { network, connectedAccount, signer, fromToken, toToken, buyAmount, slippage, sellAmount } =
    input;
  const router = Router__factory.connect(
    HlpConfig.HLP_CONTRACTS[network]?.Router ?? ethers.constants.AddressZero,
    signer
  );
  const { address: fromAddress, isNative: isFromNative } = tryParseNativeHlpToken(
    fromToken,
    network
  );
  const { address: toAddress, isNative: isToNative } = tryParseNativeHlpToken(toToken, network);

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
  } else if (isFromNative) {
    return router.populateTransaction.swapETHToTokens(
      [fromAddress, toAddress],
      buyAmountWithTolerance,
      connectedAccount,
      { value: sellAmount }
    );
  } else {
    return router.populateTransaction.swapTokensToETH(
      [fromAddress, toAddress],
      sellAmount,
      buyAmountWithTolerance,
      connectedAccount
    );
  }
};

export default {
  weight: liquidityPoolWeight,
  quote: liquidityPoolQuoteHandler,
  transaction: liquidityPoolTransactionHandler
};
