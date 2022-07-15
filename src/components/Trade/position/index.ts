import { BigNumber } from "ethers";
import { HlpDynamicConfig } from "../../../config/hlp";
import { getMarginFee } from "../getMarginFee";

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
  position: [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, boolean, BigNumber],
  collateralToken: string,
  indexToken: string,
  isLong: boolean,
  config: Pick<HlpDynamicConfig, "MARGIN_FEE_BASIS_POINTS">
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
  ] = position;
  return {
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
    positionFee: getMarginFee(size, config)
  } as Position;
};
