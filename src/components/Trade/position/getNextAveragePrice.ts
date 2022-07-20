import { BigNumber } from "ethers";

export const getNextAveragePrice = (
  size: BigNumber,
  sizeDelta: BigNumber,
  existingDelta: BigNumber,
  hasProfit: boolean,
  isLong: boolean,
  markPrice: BigNumber
): BigNumber => {
  const nextSize = size.add(sizeDelta);
  let divisor;
  if (isLong) {
    divisor = hasProfit ? nextSize.add(existingDelta) : nextSize.sub(existingDelta);
  } else {
    divisor = hasProfit ? nextSize.sub(existingDelta) : nextSize.add(existingDelta);
  }
  if (divisor.eq(0))
    throw new Error("Division by zero");
  return markPrice.mul(nextSize).div(divisor);
};
