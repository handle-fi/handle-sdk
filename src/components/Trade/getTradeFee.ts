import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, HlpConfig } from "../../config/hlp";

type RequiredConfig =
  | "MARGIN_FEE_BASIS_POINTS"
  | "STABLE_SWAP_FEE_BASIS_POINTS"
  | "SWAP_FEE_BASIS_POINTS";

export const getTradeFee = (
  isSwap: boolean,
  isStableSwap: boolean,
  collateralSize: BigNumber,
  positionSize: BigNumber,
  config: Pick<HlpConfig, RequiredConfig>
) => {
  const marginFee = positionSize.mul(config.MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
  if (isStableSwap) {
    return marginFee.add(
      collateralSize.mul(config.STABLE_SWAP_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    );
  }
  if (isSwap) {
    return marginFee.add(
      collateralSize.mul(config.SWAP_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    );
  }
  return marginFee;
};
