import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, MARGIN_FEE_BASIS_POINTS } from "../../config/hlp";

export const getMarginFee = (sizeDelta: BigNumber) => {
  const afterFeeUsd = sizeDelta
    .mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS)
    .div(BASIS_POINTS_DIVISOR);
  return sizeDelta.sub(afterFeeUsd);
};
