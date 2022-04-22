import { BigNumber } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  MARGIN_FEE_BASIS_POINTS,
  STABLE_SWAP_FEE_BASIS_POINTS,
  SWAP_FEE_BASIS_POINTS
} from "../../perp-config";

export const getTradeFee = (
  isSwap: boolean,
  isStableSwap: boolean,
  collateralSize: BigNumber,
  positionSize: BigNumber
) => {
  const marginFee = positionSize.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
  if (isStableSwap) {
    return marginFee.add(
      collateralSize.mul(STABLE_SWAP_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    );
  }
  if (isSwap) {
    return marginFee.add(collateralSize.mul(SWAP_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR));
  }
  return marginFee;
};
