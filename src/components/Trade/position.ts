import { BigNumber, ethers } from "ethers";
import { BASIS_POINTS_DIVISOR, PRICE_DECIMALS, USD_DISPLAY_DECIMALS } from "../../perp-config";
import { getFundingFee } from "./getFundingFee";
import { getPositionFee } from "./getPositionFee";

export type Position = {
  collateralToken: string;
  indexToken: string;
  isLong: boolean;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  entryFundingRate: BigNumber;
  cumulativeFundingRate: BigNumber;
  fundingFee: BigNumber;
  positionFee: BigNumber;
  hasRealisedProfit: boolean;
  realisedPnL: BigNumber;
  lastIncreasedTime: BigNumber;
  hasProfit: boolean;
  delta: BigNumber;
  markPrice: BigNumber;
  pendingDelta: BigNumber;
  deltaPercentage: BigNumber;
  deltaStr: string;
  deltaPercentageStr: string;
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
  isLong: boolean,
  getMinPriceOfToken: (token: string) => BigNumber,
  getMaxPriceOfToken: (token: string) => BigNumber,
  getFundingRate: (token: string) => BigNumber
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
  let markPrice = ethers.constants.Zero;
  if (size.gt(0)) {
    markPrice = isLong ? getMinPriceOfToken(indexToken) : getMaxPriceOfToken(indexToken);
  }
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
    isLong,
    markPrice: markPrice
  };
  position.positionFee = getPositionFee(size);

  position.pendingDelta = position.delta;
  if (position.collateral?.gt(0)) {
    if (position.delta?.eq(0) && position.averagePrice && position.markPrice) {
      const priceDelta = position.averagePrice.gt(position.markPrice)
        ? position.averagePrice.sub(position.markPrice)
        : position.markPrice.sub(position.averagePrice);
      position.pendingDelta = position.size?.mul(priceDelta).div(position.averagePrice);
    }
    position.deltaPercentage = position.pendingDelta
      ?.mul(BASIS_POINTS_DIVISOR)
      .div(position.collateral);

    const getDeltaStr = ({
      delta,
      deltaPercentage,
      hasProfit
    }: {
      delta?: BigNumber;
      deltaPercentage?: BigNumber;
      hasProfit?: boolean;
    }) => {
      if (!delta || !deltaPercentage || hasProfit === undefined) {
        return {};
      }
      let deltaStr;
      let deltaPercentageStr;

      if (delta.gt(0)) {
        deltaStr = hasProfit ? "+" : "-";
        deltaPercentageStr = hasProfit ? "+" : "-";
      } else {
        deltaStr = "";
        deltaPercentageStr = "";
      }
      deltaStr += "$" + formatPrice(delta, 2, false);
      deltaPercentageStr += `${formatPrice(deltaPercentage, 2, false, 2)}%`;

      return { deltaStr, deltaPercentageStr };
    };

    const { deltaStr, deltaPercentageStr } = getDeltaStr({
      delta: position.pendingDelta,
      deltaPercentage: position.deltaPercentage,
      hasProfit: position.hasProfit
    });

    position.deltaStr = deltaStr;
    position.deltaPercentageStr = deltaPercentageStr;

    position.netValue = position.hasProfit
      ? position.collateral.add(position.pendingDelta ?? 0)
      : position.collateral.sub(position.pendingDelta ?? 0);
  }

  if (position.collateral && position.collateral.gt(0)) {
    position.leverage =
      position.size?.mul(BASIS_POINTS_DIVISOR).div(position.collateral) || ethers.constants.Zero;
  } else {
    position.leverage = ethers.constants.Zero;
  }

  position.cumulativeFundingRate = getFundingRate(indexToken);
  position.fundingFee = getFundingFee(position as Position);

  return position as Position;
};
