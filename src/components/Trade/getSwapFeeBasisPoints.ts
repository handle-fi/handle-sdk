import { BigNumber } from "ethers";
import { getFeeBasisPoints } from "./getFeeBasisPoints";
import { Network } from "../../types/network";
import HandleTokenManager from "../TokenManager/HandleTokenManager";
import { HlpDynamicConfig } from "../../config/hlp";

export type RequiredConfig =
  | "STABLE_SWAP_FEE_BASIS_POINTS"
  | "SWAP_FEE_BASIS_POINTS"
  | "STABLE_TAX_BASIS_POINTS"
  | "TAX_BASIS_POINTS";

export const getSwapFeeBasisPoints = (
  args: {
    tokenIn: string;
    tokenOut: string;
    usdHlpDelta: BigNumber;
    usdHlpSupply: BigNumber;
    totalTokenWeights: BigNumber;
    targetUsdHlpAmount: BigNumber;
    config: Pick<HlpDynamicConfig, RequiredConfig>;
  },
  network: Network = "arbitrum"
) => {
  const tokenManager = new HandleTokenManager([]);
  const isStableSwap =
    tokenManager.isHlpStableTokenByAddress(args.tokenIn, network) &&
    tokenManager.isHlpStableTokenByAddress(args.tokenOut, network);
  const swapBasisPoints = isStableSwap
    ? args.config.STABLE_SWAP_FEE_BASIS_POINTS
    : args.config.SWAP_FEE_BASIS_POINTS;
  const taxBasisPoints = isStableSwap
    ? args.config.STABLE_TAX_BASIS_POINTS
    : args.config.TAX_BASIS_POINTS;

  const feeBasisPoints1 = getFeeBasisPoints({
    ...args,
    increment: true,
    feeBasisPoints: BigNumber.from(swapBasisPoints),
    taxBasisPoints: BigNumber.from(taxBasisPoints)
  });
  const feeBasisPoints2 = getFeeBasisPoints({
    ...args,
    increment: false,
    feeBasisPoints: BigNumber.from(swapBasisPoints),
    taxBasisPoints: BigNumber.from(taxBasisPoints)
  });
  // return largest fee basis points
  return feeBasisPoints1.gt(feeBasisPoints2) ? feeBasisPoints1 : feeBasisPoints2;
};
