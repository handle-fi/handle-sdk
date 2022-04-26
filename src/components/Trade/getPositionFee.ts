import { BigNumber, ethers } from "ethers";
import { BASIS_POINTS_DIVISOR, MARGIN_FEE_BASIS_POINTS } from "../../config/hlp-config";

export const getPositionFee = (size: BigNumber) => {
  if (!size) {
    return ethers.constants.Zero;
  }
  const afterFeeUsd = size
    .mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS)
    .div(BASIS_POINTS_DIVISOR);
  return size.sub(afterFeeUsd);
};
