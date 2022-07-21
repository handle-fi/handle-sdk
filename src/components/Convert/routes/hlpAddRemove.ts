import { BigNumber, ethers } from "ethers";
import { config, HandleTokenManager, HlpConfig } from "../../..";
import { BASIS_POINTS_DIVISOR, HLP_CONTRACTS, PRICE_DECIMALS } from "../../../config/hlp";
import { HlpManagerRouter__factory, HlpManager__factory } from "../../../contracts";
import { getHlpFeeBasisPoints } from "../../Trade";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { HLP_ADD_REMOVE_WEIGHT, WeightInput } from "./weights";
import { fetchEncodedSignedQuotes } from "../../../utils/h2so-utils";
import { pairFromString } from "../../../utils/general-utils";
import { isTradeWeekend } from "../../../utils/trade-utils";

const hlpAddRemoveWeight = async (input: WeightInput) => {
  if (!HlpConfig.HLP_CONTRACTS[input.network]?.HlpManager) {
    return 0;
  }
  if (isTradeWeekend()) return 0;

  const tokenManager = new HandleTokenManager();

  const isToValidHlp =
    tokenManager.isHlpTokenByAddress(input.toToken.address, input.network) ||
    input.toToken.extensions?.isNative;
  const isFromValidHlp =
    tokenManager.isHlpTokenByAddress(input.fromToken.address, input.network) ||
    input.fromToken.extensions?.isNative;

  if (
    (input.toToken.extensions?.isLiquidityToken && isFromValidHlp) ||
    (input.fromToken.extensions?.isLiquidityToken && isToValidHlp)
  ) {
    return HLP_ADD_REMOVE_WEIGHT;
  }
  return 0;
};

const hlpAddRemoveQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  const { network, fromToken, toToken, hlpMethods, sellAmount: fromAmount } = input;
  const hlpManagerAddress = HLP_CONTRACTS[network]?.HlpManager;
  const tokenManager = new HandleTokenManager();

  if (!hlpManagerAddress) throw new Error(`Network ${network} does not have a HlpManager contract`);
  if (!hlpMethods) throw new Error("hlpMethods is required for a hlpToken quote");
  if (!input.hlpConfig) throw new Error("hLP config is required for this route");

  // Parse ETH address into WETH address.
  const { hlpAddress: parsedFromTokenAddress } = tokenManager.checkForHlpNativeToken(fromToken);
  const { hlpAddress: parsedToTokenAddress } = tokenManager.checkForHlpNativeToken(toToken);
  const isBuyingHlp = toToken.extensions?.isLiquidityToken;
  const hLPPrice = hlpMethods.getHlpPrice(!!isBuyingHlp);

  // If buying hlp, then usdHlp delta is the price of the swap token (mul by the amount)
  let usdHlpDelta = hlpMethods
    .getMinPrice(parsedFromTokenAddress)
    .mul(fromAmount)
    .div(ethers.utils.parseUnits("1", PRICE_DECIMALS));

  // if selling hlp, then usdHlp delta is the price of the hlp token (mul by the amount)
  if (!isBuyingHlp) {
    usdHlpDelta = hLPPrice.mul(fromAmount).div(ethers.utils.parseUnits("1", 18));
  }

  const feeBasisPoints = getHlpFeeBasisPoints({
    token: isBuyingHlp ? parsedFromTokenAddress : parsedToTokenAddress,
    usdHlpDelta,
    isBuy: !!isBuyingHlp,
    totalTokenWeights: hlpMethods.getTotalTokenWeights(),
    targetUsdHlpAmount: hlpMethods.getTargetUsdHlpAmount(
      isBuyingHlp ? parsedFromTokenAddress : parsedToTokenAddress
    ),
    usdHlpSupply: hlpMethods.getUsdHlpSupply(),
    config: input.hlpConfig
  });

  if (isBuyingHlp) {
    const hlpAmount = usdHlpDelta.mul(ethers.utils.parseUnits("1", PRICE_DECIMALS)).div(hLPPrice);

    return {
      allowanceTarget: hlpManagerAddress,
      sellAmount: fromAmount.toString(),
      buyAmount: hlpAmount.toString(),
      gas: config.convert.gasEstimates.hlp,
      feeBasisPoints: feeBasisPoints.toNumber(),
      feeChargedBeforeConvert: false
    };
  }
  // The buy amount is the usdHlp delta divided by the price of the token (adjusted for decimals)
  const buyAmount = usdHlpDelta
    .mul(ethers.utils.parseUnits("1", toToken.decimals))
    .div(
      hlpMethods.getMaxPrice(parsedToTokenAddress).isZero()
        ? ethers.constants.One
        : hlpMethods.getMaxPrice(parsedToTokenAddress)
    );

  return {
    allowanceTarget: hlpManagerAddress,
    sellAmount: fromAmount.toString(),
    buyAmount: buyAmount.toString(),
    gas: config.convert.gasEstimates.hlp,
    feeBasisPoints: feeBasisPoints.toNumber(),
    feeChargedBeforeConvert: false
  };
};

const hlpAddRemoveTransactionHandler = async (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  const {
    network,
    signer,
    fromToken,
    toToken,
    receivingAccount: connectedAccount,
    sellAmount,
    buyAmount,
    slippage,
    hlpMethods: hlpInfo
  } = input;

  if (!hlpInfo) throw new Error("hlpInfo is required for a hlpToken transaction");
  const tokenManager = new HandleTokenManager();

  const buyAmountWithTolerance = BigNumber.from(buyAmount)
    .mul(BASIS_POINTS_DIVISOR - slippage * 100)
    .div(BASIS_POINTS_DIVISOR);

  const hlpManager = HlpManager__factory.connect(
    HLP_CONTRACTS[network]?.HlpManager ?? ethers.constants.AddressZero,
    signer
  );

  const hlpManagerRouter = HlpManagerRouter__factory.connect(
    HLP_CONTRACTS[network]?.HlpManagerRouter ?? ethers.constants.AddressZero,
    signer
  );

  const { hlpAddress: fromAddress } = tokenManager.checkForHlpNativeToken(fromToken);
  const { hlpAddress: toAddress } = tokenManager.checkForHlpNativeToken(toToken);

  const { encoded: encodedSignedQuotes } = await fetchEncodedSignedQuotes(
    new HandleTokenManager()
      .getHlpTokens(network)
      .map(({ symbol }) => pairFromString(`${symbol}/USD`))
  );

  // If selling Hlp and toToken is native
  if (fromToken.extensions?.isLiquidityToken && toToken.extensions?.isNative) {
    return hlpManagerRouter.populateTransaction.removeLiquidityETH(
      BigNumber.from(sellAmount),
      buyAmountWithTolerance,
      connectedAccount,
      encodedSignedQuotes
    );
  }
  if (fromToken.extensions?.isLiquidityToken && !toToken.extensions?.isNative) {
    // If selling Hlp and toToken is not native
    return hlpManager.populateTransaction.removeLiquidity(
      toAddress,
      BigNumber.from(sellAmount),
      buyAmountWithTolerance,
      connectedAccount,
      encodedSignedQuotes
    );
  }

  // buying hlp
  const minPriceInUsdHlp = hlpInfo
    .getMinPrice(fromToken.address)
    .mul(10_000 - slippage * 100)
    .div(ethers.utils.parseUnits("1", PRICE_DECIMALS - 18))
    .div(BASIS_POINTS_DIVISOR);

  if (fromToken.extensions?.isNative) {
    return hlpManagerRouter.populateTransaction.addLiquidityETH(
      minPriceInUsdHlp,
      buyAmountWithTolerance,
      encodedSignedQuotes,
      {
        value: BigNumber.from(sellAmount)
      }
    );
  }
  return hlpManager.populateTransaction.addLiquidity(
    fromAddress,
    BigNumber.from(sellAmount),
    minPriceInUsdHlp,
    buyAmountWithTolerance,
    encodedSignedQuotes
  );
};

export default {
  weight: hlpAddRemoveWeight,
  quote: hlpAddRemoveQuoteHandler,
  transaction: hlpAddRemoveTransactionHandler
};
