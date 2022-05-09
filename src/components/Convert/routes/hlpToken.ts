import { BigNumber, ethers } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  HLP_CONTRACTS,
  HLP_SWAP_GAS_LIMIT,
  PRICE_DECIMALS
} from "../../../config/hlp";
import { HlpManagerRouter__factory, HlpManager__factory } from "../../../contracts";
import { tryParseNativeHlpToken } from "../../../utils/hlp";
import { getHlpFeeBasisPoints } from "../../Trade";
import { ConvertQuoteInput, ConvertTransactionInput, Quote, Transaction } from "../Convert";
import { HLP_WEIGHT, WeightInput } from "./weights";

const hlpTokenWeight = async (input: WeightInput) => {
  if (input.toToken.symbol === "hLP" || input.fromToken.symbol === "hLP") {
    return HLP_WEIGHT;
  }
};

const hlpTokenQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  const { network, fromToken, toToken, hlpMethods, fromAmount } = input;

  if (!hlpMethods) throw new Error("hlpMethods is required for a hlpToken quote");

  const hlpManagerAddress = HLP_CONTRACTS[network]?.HlpManager;
  if (!hlpManagerAddress) throw new Error("No HlpManager for this network");
  // Parse ETH address into WETH address.
  const { address: parsedFromTokenAddress } = tryParseNativeHlpToken(fromToken, network);
  const { address: parsedToTokenAddress } = tryParseNativeHlpToken(toToken, network);
  const isBuyingHlp = toToken.symbol === "hLP";
  const hLPPrice = hlpMethods.getHlpPrice(isBuyingHlp);

  // If buying hlp, then usdg delta is the price of the swap token (mul by the amount)
  let usdgDelta = hlpMethods
    .getMinPrice(parsedFromTokenAddress)
    .mul(fromAmount)
    .div(ethers.utils.parseUnits("1", PRICE_DECIMALS));

  // if selling hlp, then usdg delta is the price of the hlp token (mul by the amount)
  if (!isBuyingHlp) {
    usdgDelta = hLPPrice.mul(fromAmount).div(ethers.utils.parseUnits("1", 18));
  }

  const feeBasisPoints = getHlpFeeBasisPoints({
    token: isBuyingHlp ? parsedFromTokenAddress : parsedToTokenAddress,
    usdgDelta,
    isBuy: isBuyingHlp,
    totalTokenWeights: hlpMethods.getTotalTokenWeights(),
    targetUsdgAmount: hlpMethods.getTargetUsdgAmount(
      isBuyingHlp ? parsedFromTokenAddress : parsedToTokenAddress
    ),
    getTokenInfo: hlpMethods.getTokenInfo,
    usdgSupply: hlpMethods.getUsdgSupply()
  });

  if (isBuyingHlp) {
    const hlpAmount = usdgDelta.mul(ethers.utils.parseUnits("1", PRICE_DECIMALS)).div(hLPPrice);

    return {
      allowanceTarget: hlpManagerAddress,
      sellAmount: fromAmount.toString(),
      buyAmount: hlpAmount.toString(),
      gas: HLP_SWAP_GAS_LIMIT,
      feeBasisPoints: feeBasisPoints.toNumber()
    };
  } else {
    // The buy amount is the usdg delta divided by the price of the token (adjusted for decimals)
    const buyAmount = usdgDelta
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
      gas: HLP_SWAP_GAS_LIMIT,
      feeBasisPoints: feeBasisPoints.toNumber()
    };
  }
};

const hlpTokenTransactionHandler = async (input: ConvertTransactionInput): Promise<Transaction> => {
  const {
    network,
    signer,
    fromToken,
    toToken,
    connectedAccount,
    sellAmount,
    buyAmount,
    slippage,
    hlpMethods: hlpInfo
  } = input;

  if (!hlpInfo) throw new Error("hlpInfo is required for a hlpToken transaction");

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

  const { address: fromAddress } = tryParseNativeHlpToken(fromToken, network);
  const { address: toAddress } = tryParseNativeHlpToken(toToken, network);

  if (fromToken.symbol === "hLP") {
    // selling hlp
    if (toToken.isNative) {
      // if is native
      return hlpManagerRouter.populateTransaction.removeLiquidityETH(
        BigNumber.from(sellAmount),
        buyAmountWithTolerance,
        connectedAccount
      );
    } else {
      // if both tokens are not native
      return hlpManager.populateTransaction.removeLiquidity(
        toAddress,
        BigNumber.from(sellAmount),
        buyAmountWithTolerance,
        connectedAccount
      );
    }
  } else {
    // buying hlp
    const minPriceInUsdg = hlpInfo
      .getMinPrice(fromToken.address)
      .mul(10_000 - slippage * 100)
      .div(ethers.utils.parseUnits("1", PRICE_DECIMALS - 18))
      .div(BASIS_POINTS_DIVISOR);

    if (fromToken.isNative) {
      // if is native
      return hlpManagerRouter.populateTransaction.addLiquidityETH(
        minPriceInUsdg,
        buyAmountWithTolerance,
        {
          value: BigNumber.from(sellAmount)
        }
      );
    } else {
      // if not native
      return hlpManager.populateTransaction.addLiquidity(
        fromAddress,
        BigNumber.from(sellAmount),
        minPriceInUsdg,
        buyAmountWithTolerance
      );
    }
  }
};

export default {
  weight: hlpTokenWeight,
  quote: hlpTokenQuoteHandler,
  transaction: hlpTokenTransactionHandler
};
