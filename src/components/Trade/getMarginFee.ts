import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, HlpConfig } from "../../config/hlp";

export const getMarginFee = (
  sizeDelta: BigNumber,
  config: Pick<HlpConfig, "MARGIN_FEE_BASIS_POINTS">
) => {
  const afterFeeUsd = sizeDelta
    .mul(BASIS_POINTS_DIVISOR - config.MARGIN_FEE_BASIS_POINTS)
    .div(BASIS_POINTS_DIVISOR);
  return sizeDelta.sub(afterFeeUsd);
};
