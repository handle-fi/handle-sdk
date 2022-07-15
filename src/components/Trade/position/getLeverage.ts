import { BigNumber, ethers } from "ethers";
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION } from "../../../config/hlp";
import { Position } from ".";

type GetLeverageArgs = {
  size: BigNumber;
  collateral: BigNumber;
  entryFundingRate?: BigNumber;
  cumulativeFundingRate?: BigNumber;
  hasProfit: boolean;
  delta?: BigNumber;
};

type PositionDelta = {
  sizeDelta: BigNumber;
  increaseSize: boolean;
  collateralDelta: BigNumber;
  increaseCollateral: boolean;
};

const DEFAULT_POSITION_DELTA: PositionDelta = {
  sizeDelta: ethers.constants.Zero,
  increaseSize: false,
  collateralDelta: ethers.constants.Zero,
  increaseCollateral: false
};

/**
 * Gets the leverage of a position, including possible deltas.
 * @param leverageArgs the arguments necessary for calculating the leverage
 * @param deltas the position deltas
 * @returns the leverage in basis points
 */
export const getLeverage = (
  { size, collateral, entryFundingRate, cumulativeFundingRate, hasProfit, delta }: GetLeverageArgs,
  marginFeeBasisPoints: number,
  {
    sizeDelta,
    collateralDelta,
    increaseCollateral,
    increaseSize
  }: PositionDelta = DEFAULT_POSITION_DELTA
) => {
  const nextSize = increaseSize ? size.add(sizeDelta) : size.sub(sizeDelta);
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
    ? remainingCollateral.mul(BASIS_POINTS_DIVISOR - marginFeeBasisPoints).div(BASIS_POINTS_DIVISOR)
    : remainingCollateral;

  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size
      .mul(cumulativeFundingRate.sub(entryFundingRate))
      .div(FUNDING_RATE_PRECISION);
    remainingCollateral = remainingCollateral.sub(fundingFee);
  }

  return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral);
};

/**
 * Gets the current leverage for a positon, including potential changes.
 * @param position The position from which to get the leverage
 * @param positionDelta Any changes to the position size or collateral
 * @param cumulativeFundingRate The cumulative funding rate of the position index token
 * @returns the new leverage in basis points
 */
export const getLeverageFromPosition = (
  position: Required<Position>,
  marginFeeBasisPoints: number,
  positionDelta: PositionDelta = DEFAULT_POSITION_DELTA,
  cumulativeFundingRate?: BigNumber
) => {
  return getLeverage(
    {
      size: position.size,
      ...positionDelta,
      collateral: position.collateral,
      hasProfit: position.hasProfit,
      entryFundingRate: position.entryFundingRate,
      cumulativeFundingRate,
      delta: position.delta
    },
    marginFeeBasisPoints
  );
};
