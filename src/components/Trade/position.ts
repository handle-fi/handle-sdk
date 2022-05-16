import { BigNumber, ethers } from "ethers";
import { getLeverage } from "./getLeverage";
import { getMarginFee } from "./getMarginFee";

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
  hasProfit: boolean;
  delta: BigNumber;
  netValue: BigNumber;
  leverage: BigNumber;
};

export const contractPositionToPosition = (
  _position: BigNumber[],
  collateralToken: string,
  indexToken: string,
  isLong: boolean
): Position => {
  const [
    size,
    collateral,
    averagePrice,
    entryFundingRate,
    hasRealisedProfit,
    realisedPnL,
    lastIncreasedTime,
    hasProfit,
    delta
  ] = _position;
  let position: Partial<Position> = {
    collateralToken,
    indexToken,
    size,
    collateral,
    averagePrice,
    entryFundingRate,
    hasRealisedProfit: hasRealisedProfit.eq(1),
    realisedPnL,
    lastIncreasedTime,
    hasProfit: hasProfit.eq(1),
    delta,
    isLong
  };
  position.positionFee = getMarginFee(size);

  if (position.collateral && position.collateral.gt(0)) {
    position.leverage = getLeverage({
      size,
      sizeDelta: ethers.constants.Zero,
      collateral,
      collateralDelta: ethers.constants.Zero,
      hasProfit: !!position.hasProfit,
      includeDelta: true
    });
  } else {
    position.leverage = ethers.constants.Zero;
  }

  return position as Position;
};
