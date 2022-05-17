import { BigNumber, ethers } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  MIN_PROFIT_BASIS_POINTS,
  MIN_PROFIT_TIME
} from "../../../config/hlp";
import { Position } from ".";

export const getPositionDelta = (
  indexPrice: BigNumber,
  { size, collateral, isLong, averagePrice, lastIncreasedTime }: Position
) => {
  const priceDelta = averagePrice.gt(indexPrice)
    ? averagePrice.sub(indexPrice)
    : indexPrice.sub(averagePrice);
  let delta = size.mul(priceDelta).div(averagePrice);
  const pendingDelta = delta;

  const minProfitExpired = lastIncreasedTime.add(MIN_PROFIT_TIME).lt(Date.now() / 1000);
  const hasProfit = isLong ? indexPrice.gt(averagePrice) : indexPrice.lt(averagePrice);
  const isDeltaTooLow = delta.mul(BASIS_POINTS_DIVISOR).lte(size.mul(MIN_PROFIT_BASIS_POINTS));
  if (!minProfitExpired && hasProfit && isDeltaTooLow) {
    delta = ethers.constants.Zero;
  }

  const deltaPercentage = delta.mul(BASIS_POINTS_DIVISOR).div(collateral);
  const pendingDeltaPercentage = pendingDelta.mul(BASIS_POINTS_DIVISOR).div(collateral);

  return {
    delta,
    pendingDelta,
    pendingDeltaPercentage,
    hasProfit,
    deltaPercentage
  };
};
