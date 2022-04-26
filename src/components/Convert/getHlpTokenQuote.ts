import { BigNumber, ethers } from "ethers";
import { HlpToken, HLP_CONTRACTS, HLP_SWAP_GAS_LIMIT, PRICE_DECIMALS } from "../../hlp-config";
import { HlpInfoMethods } from "../Trade/types";
import { getHlpFeeBasisPoints } from "../Trade/getHlpFeeBasisPoints";
import { tryParseNativeHlpToken } from "./tryParseNativeHlpToken";
import { Network } from "../../types/network";

export const getHlpTokenQuote = ({
  fromToken,
  toToken,
  network,
  hlpInfo,
  fromAmount
}: {
  fromToken: HlpToken;
  toToken: HlpToken;
  network: Network;
  hlpInfo: HlpInfoMethods;
  fromAmount: BigNumber;
}) => {
  // Parse ETH address into WETH address.
  const { address: parsedFromTokenAddress } = tryParseNativeHlpToken(fromToken, network);
  const { address: parsedToTokenAddress } = tryParseNativeHlpToken(toToken, network);
  const isBuyingHlp = toToken.symbol === "hLP";
  const hLPPrice = hlpInfo.getHlpPrice(isBuyingHlp);

  // If buying hlp, then usdg delta is the price of the swap token (mul by the amount)
  let usdgDelta = hlpInfo
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
    totalTokenWeights: hlpInfo.getTotalTokenWeights(),
    targetUsdgAmount: hlpInfo.getTargetUsdgAmount(
      isBuyingHlp ? parsedFromTokenAddress : parsedToTokenAddress
    ),
    getTokenInfo: hlpInfo.getTokenInfo,
    usdgSupply: hlpInfo.getUsdgSupply()
  });

  if (isBuyingHlp) {
    const hlpAmount = usdgDelta.mul(ethers.utils.parseUnits("1", PRICE_DECIMALS)).div(hLPPrice);

    return {
      quote: {
        allowanceTarget: HLP_CONTRACTS[network].HlpManager,
        sellAmount: fromAmount.toString(),
        buyAmount: hlpAmount.toString(),
        gas: HLP_SWAP_GAS_LIMIT
      },
      feeBasisPoints
    };
  } else {
    // The buy amount is the usdg delta divided by the price of the token (adjusted for decimals)
    const buyAmount = usdgDelta
      .mul(ethers.utils.parseUnits("1", toToken.decimals))
      .div(
        hlpInfo.getMaxPrice(parsedToTokenAddress).isZero()
          ? ethers.constants.One
          : hlpInfo.getMaxPrice(parsedToTokenAddress)
      );

    return {
      quote: {
        allowanceTarget: HLP_CONTRACTS[network].HlpManager,
        sellAmount: fromAmount.toString(),
        buyAmount: buyAmount.toString(),
        gas: HLP_SWAP_GAS_LIMIT
      },
      feeBasisPoints
    };
  }
};
