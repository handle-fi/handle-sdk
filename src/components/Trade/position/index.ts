import { BigNumber } from "ethers";
import { getMarginFee } from "./../getMarginFee";

export type Position = {
  collateralToken: string;
  indexToken: string;
  isLong: boolean;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  entryFundingRate: BigNumber;
  positionFee: BigNumber;
  hasRealisedProfit: boolean;
  realisedPnL: BigNumber;
  lastIncreasedTime: BigNumber;
  reserveAmount: BigNumber;
  delta?: BigNumber;
  hasProfit?: boolean;
};

export const contractPositionToPosition = (
  _position: [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, boolean, BigNumber],
  collateralToken: string,
  indexToken: string,
  isLong: boolean
): Position => {
  const [
    size,
    collateral,
    averagePrice,
    entryFundingRate,
    reserveAmount,
    realisedPnL,
    hasRealisedProfit,
    lastIncreasedTime
  ] = _position;
  let position: Position = {
    collateralToken,
    indexToken,
    size,
    collateral,
    averagePrice,
    reserveAmount,
    entryFundingRate,
    hasRealisedProfit,
    realisedPnL,
    lastIncreasedTime,
    isLong,
    positionFee: getMarginFee(size)
  };

  return position as Position;
};
