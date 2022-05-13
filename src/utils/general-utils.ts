import { BigNumber } from "ethers";

export const getDeadline = (deadline?: number) => deadline ?? Math.floor(Date.now() / 1000) + 300;

/**
 * Adjusts a BigNumber by the difference between the current and desired decimals
 * @param value The value to transform
 * @param fromDecimals the current decimals of the number
 * @param toDecimals the desired decimals of the number
 * @returns the transformed value
 */
export const transformDecimals = (value: BigNumber, fromDecimals: number, toDecimals: number) => {
  const TEN = BigNumber.from(10);
  if (fromDecimals < toDecimals) {
    return value.mul(TEN.pow(toDecimals - fromDecimals));
  }
  if (fromDecimals > toDecimals) {
    return value.div(TEN.pow(fromDecimals - toDecimals));
  }
  return value;
};
