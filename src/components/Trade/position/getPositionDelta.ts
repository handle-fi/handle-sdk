import { BigNumber, ethers } from "ethers";
import { BASIS_POINTS_DIVISOR, HlpConfig } from "../../../config/hlp";
import { Position } from ".";

/**
 * Gets the delta for a position given the current price of the index token.
 * @param indexPrice the price of the index token (in price decimals)
 * @param position the position from which to calculate the delta
 * @param minProfitTime the number of seconds until the position can take profit
 * @param minProfitBasisPoints the profit percentage a position has to reach to
 * take profit before {minProfitTime}
 * @returns the current delta, and delta percentage, and pending delta of
 * the position as well as whether the position has profit. Pending delta
 * refers to the delta of the position before the minimum profit time has
 * passed, or the minimum profit delta has been exceeded.
 */
export const getPositionDelta = (
  indexPrice: BigNumber,
  { size, collateral, isLong, averagePrice, lastIncreasedTime }: Position,
  config: Pick<HlpConfig, "MIN_PROFIT_TIME">,
  minProfitBasisPoints: number
) => {
  const priceDelta = averagePrice.gt(indexPrice)
    ? averagePrice.sub(indexPrice)
    : indexPrice.sub(averagePrice);
  let delta = size.mul(priceDelta).div(averagePrice);
  const pendingDelta = delta;

  const minProfitExpired = lastIncreasedTime
    .add(config.MIN_PROFIT_TIME)
    .lt(Math.floor(Date.now() / 1000));
  const hasProfit = isLong ? indexPrice.gt(averagePrice) : indexPrice.lt(averagePrice);
  const isDeltaTooLow = delta.mul(BASIS_POINTS_DIVISOR).lte(size.mul(minProfitBasisPoints));
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
