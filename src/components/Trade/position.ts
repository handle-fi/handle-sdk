import { BigNumber, ethers } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  PRICE_DECIMALS,
  USD_DISPLAY_DECIMALS
} from "../../config/hlp-config";
import { getPositionFee } from "./getPositionFee";

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

export const formatPrice = (
  price: BigNumber,
  displayDecimals = USD_DISPLAY_DECIMALS,
  showCurrency = true,
  decimals = PRICE_DECIMALS
) => {
  if (!price) return "";
  return `${(
    +price.div(ethers.utils.parseUnits("1", decimals - displayDecimals)) /
    10 ** displayDecimals
  ).toLocaleString(undefined, {
    minimumFractionDigits: displayDecimals,
    maximumFractionDigits: displayDecimals
  })}${showCurrency ? " USD" : ""}`;
};

export const contractPositionToPosition = async (
  _position: BigNumber[],
  collateralToken: string,
  indexToken: string,
  isLong: boolean
): Promise<Position> => {
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
  position.positionFee = getPositionFee(size);

  if (position.collateral && position.collateral.gt(0)) {
    position.leverage =
      position.size?.mul(BASIS_POINTS_DIVISOR).div(position.collateral) || ethers.constants.Zero;
  } else {
    position.leverage = ethers.constants.Zero;
  }

  return position as Position;
};
