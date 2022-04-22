import { BigNumber, ethers } from "ethers";
import { PerpToken, PERP_CONTRACTS, PERP_SWAP_GAS_LIMIT, PRICE_DECIMALS } from "../../perp-config";
import { PerpInfoMethods } from "../Trade/types";
import { getHlpFeeBasisPoints } from "../Trade/getHlpFeeBasisPoints";
import { tryParseNativePerpToken } from "./tryParseNativePerpToken";
import { Network } from "../../types/network";

export const getHlpTokenQuote = ({
  fromToken,
  toToken,
  network,
  perpInfo,
  fromAmount
}: {
  fromToken: PerpToken;
  toToken: PerpToken;
  network: Network;
  perpInfo: PerpInfoMethods;
  fromAmount: BigNumber;
}) => {
  // Parse ETH address into WETH address.
  const { address: parsedFromTokenAddress } = tryParseNativePerpToken(fromToken, network);
  const { address: parsedToTokenAddress } = tryParseNativePerpToken(toToken, network);
  const isBuyingHlp = toToken.symbol === "hLP";
  const hLPPrice = perpInfo.getHlpPrice(isBuyingHlp);

  // If buying hlp, then usdg delta is the price of the swap token (mul by the amount)
  let usdgDelta = perpInfo
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
    totalTokenWeights: perpInfo.getTotalTokenWeights(),
    targetUsdgAmount: perpInfo.getTargetUsdgAmount(
      isBuyingHlp ? parsedFromTokenAddress : parsedToTokenAddress
    ),
    getTokenInfo: perpInfo.getTokenInfo,
    usdgSupply: perpInfo.getUsdgSupply()
  });

  if (isBuyingHlp) {
    const hlpAmount = usdgDelta.mul(ethers.utils.parseUnits("1", PRICE_DECIMALS)).div(hLPPrice);

    return {
      quote: {
        allowanceTarget: PERP_CONTRACTS[network].HlpManager,
        sellAmount: fromAmount.toString(),
        buyAmount: hlpAmount.toString(),
        gas: PERP_SWAP_GAS_LIMIT
      },
      feeBasisPoints
    };
  } else {
    // The buy amount is the usdg delta divided by the price of the token (adjusted for decimals)
    const buyAmount = usdgDelta
      .mul(ethers.utils.parseUnits("1", toToken.decimals))
      .div(
        perpInfo.getMaxPrice(parsedToTokenAddress).isZero()
          ? ethers.constants.One
          : perpInfo.getMaxPrice(parsedToTokenAddress)
      );

    return {
      quote: {
        allowanceTarget: PERP_CONTRACTS[network].HlpManager,
        sellAmount: fromAmount.toString(),
        buyAmount: buyAmount.toString(),
        gas: PERP_SWAP_GAS_LIMIT
      },
      feeBasisPoints
    };
  }
};
