import { BigNumber } from "ethers";
import { getFeeBasisPoints } from "./getFeeBasisPoints";
import { Network } from "../../types/network";
import HandleTokenManager from "../TokenManager/HandleTokenManager";
import { HlpConfig } from "../../config/hlp";

export type RequiredConfig =
  | "stableSwapFeeBasisPoints"
  | "swapFeeBasisPoints"
  | "stableTaxBasisPoints"
  | "taxBasisPoints";

export const getSwapFeeBasisPoints = (
  args: {
    tokenIn: string;
    tokenOut: string;
    usdHlpDelta: BigNumber;
    usdHlpSupply: BigNumber;
    totalTokenWeights: BigNumber;
    targetUsdHlpAmount: BigNumber;
    config: Pick<HlpConfig, RequiredConfig>;
  },
  network: Network = "arbitrum"
) => {
  const tokenManager = new HandleTokenManager([]);
  const isStableSwap =
    tokenManager.isHlpStableTokenByAddress(args.tokenIn, network) &&
    tokenManager.isHlpStableTokenByAddress(args.tokenOut, network);
  const swapBasisPoints = isStableSwap
    ? args.config.stableSwapFeeBasisPoints
    : args.config.swapFeeBasisPoints;
  const taxBasisPoints = isStableSwap
    ? args.config.stableTaxBasisPoints
    : args.config.taxBasisPoints;

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
