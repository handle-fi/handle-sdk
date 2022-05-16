import { BigNumber } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  FUNDING_RATE_PRECISION,
  MARGIN_FEE_BASIS_POINTS
} from "../../config/hlp";

type GetLeverageArgs = {
  size: BigNumber;
  sizeDelta: BigNumber;
  increaseSize?: boolean;
  collateral: BigNumber;
  collateralDelta: BigNumber;
  increaseCollateral?: boolean;
  entryFundingRate?: BigNumber;
  cumulativeFundingRate?: BigNumber;
  hasProfit: boolean;
  delta?: BigNumber;
  includeDelta: boolean;
};

export function getLeverage({
  size,
  sizeDelta,
  increaseSize,
  collateral,
  collateralDelta,
  increaseCollateral,
  entryFundingRate,
  cumulativeFundingRate,
  hasProfit,
  delta
}: GetLeverageArgs) {
  let nextSize = increaseSize ? size.add(sizeDelta) : size.sub(sizeDelta);
  let remainingCollateral = increaseCollateral
    ? collateral.add(collateralDelta)
    : collateral.sub(collateralDelta);

  if (nextSize.lt(0)) {
    throw new Error("SizeDelta must be less than size when decreasing size.");
  }
  if (remainingCollateral.lt(0)) {
    throw new Error("CollateralDelta must be less than collateral when decreasing collateral.");
  }

  if (delta) {
    remainingCollateral = hasProfit
      ? remainingCollateral.add(delta)
      : remainingCollateral.sub(delta);
  }

  if (remainingCollateral.eq(0)) {
    throw new Error("No remaining collateral");
  }

  remainingCollateral = !sizeDelta.isZero()
    ? remainingCollateral
        .mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS)
        .div(BASIS_POINTS_DIVISOR)
    : remainingCollateral;

  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size
      .mul(cumulativeFundingRate.sub(entryFundingRate))
      .div(FUNDING_RATE_PRECISION);
    remainingCollateral = remainingCollateral.sub(fundingFee);
  }

  return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral);
}
