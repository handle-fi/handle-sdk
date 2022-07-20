import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, HlpConfig } from "../../config/hlp";

type RequiredConfig = "marginFeeBasisPoints" | "stableSwapFeeBasisPoints" | "swapFeeBasisPoints";

export const getTradeFee = (
  isSwap: boolean,
  isStableSwap: boolean,
  collateralSize: BigNumber,
  positionSize: BigNumber,
  config: Pick<HlpConfig, RequiredConfig>
) => {
  const marginFee = positionSize.mul(config.marginFeeBasisPoints).div(BASIS_POINTS_DIVISOR);
  if (isStableSwap) {
    return marginFee.add(
      collateralSize.mul(config.stableSwapFeeBasisPoints).div(BASIS_POINTS_DIVISOR)
    );
  }
  if (isSwap) {
    return marginFee.add(collateralSize.mul(config.swapFeeBasisPoints).div(BASIS_POINTS_DIVISOR));
  }
  return marginFee;
};
