import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, HlpConfig } from "../../config/hlp";

export const getMarginFee = (
  sizeDelta: BigNumber,
  config: Pick<HlpConfig, "marginFeeBasisPoints">
) => {
  const afterFeeUsd = sizeDelta
    .mul(BASIS_POINTS_DIVISOR - config.marginFeeBasisPoints)
    .div(BASIS_POINTS_DIVISOR);
  return sizeDelta.sub(afterFeeUsd);
};
