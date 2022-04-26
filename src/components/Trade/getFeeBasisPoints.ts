import { BigNumber, ethers } from "ethers";
import { VaultTokenInfo } from "./types";

type FeeBasisPointsArgs = {
  token: string;
  usdgDelta: BigNumber;
  feeBasisPoints: BigNumber;
  taxBasisPoints: BigNumber;
  increment: boolean;
  usdgSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdgAmount: BigNumber;
  getTokenInfo: (token: string) => VaultTokenInfo | undefined;
};

export const getFeeBasisPoints = ({
  token,
  usdgDelta,
  feeBasisPoints,
  taxBasisPoints,
  increment,
  getTokenInfo,
  targetUsdgAmount
}: FeeBasisPointsArgs) => {
  const tokenInfo = getTokenInfo(token);
  if (!tokenInfo) return ethers.constants.Zero;

  const initialAmount = tokenInfo.usdgAmount;
  let nextAmount = initialAmount.add(usdgDelta);
  if (!increment) {
    nextAmount = usdgDelta.gt(initialAmount) ? ethers.constants.Zero : initialAmount.sub(usdgDelta);
  }

  const targetAmount = targetUsdgAmount;
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
