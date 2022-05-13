import { BigNumber, ethers } from "ethers";
import { VaultTokenInfo } from "./types";

type FeeBasisPointsArgs = {
  token: string;
  usdHlpDelta: BigNumber;
  feeBasisPoints: BigNumber;
  taxBasisPoints: BigNumber;
  increment: boolean;
  usdHlpSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdHlpAmount: BigNumber;
  getTokenInfo: (token: string) => VaultTokenInfo | undefined;
};

export const getFeeBasisPoints = ({
  token,
  usdHlpDelta,
  feeBasisPoints,
  taxBasisPoints,
  increment,
  getTokenInfo,
  targetUsdHlpAmount
}: FeeBasisPointsArgs) => {
  const tokenInfo = getTokenInfo(token);
  if (!tokenInfo) return ethers.constants.Zero;

  const initialAmount = tokenInfo.usdHlpAmount;
  let nextAmount = initialAmount.add(usdHlpDelta);
  if (!increment) {
    nextAmount = usdHlpDelta.gt(initialAmount)
      ? ethers.constants.Zero
      : initialAmount.sub(usdHlpDelta);
  }

  const targetAmount = targetUsdHlpAmount;
  if (!targetAmount || targetAmount.eq(0)) {
    return feeBasisPoints;
  }

  const initialDiff = initialAmount.gt(targetAmount)
    ? initialAmount.sub(targetAmount)
    : targetAmount.sub(initialAmount);
  const nextDiff = nextAmount.gt(targetAmount)
    ? nextAmount.sub(targetAmount)
    : targetAmount.sub(nextAmount);

  if (nextDiff.lt(initialDiff)) {
    const rebateBps = taxBasisPoints.mul(initialDiff).div(targetAmount);
    return rebateBps.gt(feeBasisPoints) ? ethers.constants.Zero : feeBasisPoints.sub(rebateBps);
  }

  let averageDiff = initialDiff.add(nextDiff).div(2);
  if (averageDiff.gt(targetAmount)) {
    averageDiff = targetAmount;
  }
  const taxBps = taxBasisPoints.mul(averageDiff).div(targetAmount);
  return feeBasisPoints.add(taxBps);
};
