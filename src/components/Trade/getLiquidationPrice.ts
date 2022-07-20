import { BigNumber, ethers } from "ethers";
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, HlpConfig } from "../../config/hlp";
import { getLiquidationPriceFromDelta } from "./getLiquidationPriceFromDelta";
import { getMarginFee } from "./getMarginFee";
import { Position } from "./position";

type LiquidationDelta = {
  sizeDelta: BigNumber;
  collateralDelta: BigNumber;
  increaseCollateral: boolean;
  increaseSize: boolean;
};

type RequiredConfig = "liquidationFee" | "maxLeverage" | "marginFeeBasisPoints";

export const getLiquidationPrice = (
  position: Required<Position>,
  indexTokenCumulativeFundingRate: BigNumber,
  config: Pick<HlpConfig, RequiredConfig>,
  deltaInfo?: LiquidationDelta
): BigNumber => {
  let { isLong, size, collateral, averagePrice, entryFundingRate, delta, hasProfit } = position;
  let { sizeDelta, collateralDelta, increaseCollateral, increaseSize } = deltaInfo ?? {};
  let nextSize = size;
  let remainingCollateral = collateral;

  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta);
    } else {
      nextSize = size.sub(sizeDelta);
    }

    if (sizeDelta && !hasProfit && !size.isZero()) {
      const adjustedDelta = sizeDelta.mul(delta).div(size);
      remainingCollateral = remainingCollateral.sub(adjustedDelta);
    }
  }

  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = remainingCollateral.add(collateralDelta);
    } else {
      if (collateralDelta.gte(remainingCollateral)) {
        return ethers.constants.Zero;
      }
      remainingCollateral = remainingCollateral.sub(collateralDelta);
    }
  }

  let positionFee = getMarginFee(size, config).add(config.liquidationFee);
  if (entryFundingRate && indexTokenCumulativeFundingRate) {
    const fundingFee = size
      .mul(indexTokenCumulativeFundingRate.sub(entryFundingRate))
      .div(FUNDING_RATE_PRECISION);
    positionFee = positionFee.add(fundingFee);
  }

  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: positionFee,
    size: nextSize,
    collateral: remainingCollateral,
    averagePrice,
    isLong
  });

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: nextSize.mul(BASIS_POINTS_DIVISOR).div(config.maxLeverage),
    size: nextSize,
    collateral: remainingCollateral,
    averagePrice,
    isLong
  });

  if (!liquidationPriceForFees) {
    return liquidationPriceForMaxLeverage;
  }
  if (!liquidationPriceForMaxLeverage) {
    return liquidationPriceForFees;
  }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage)
      ? liquidationPriceForFees
      : liquidationPriceForMaxLeverage;
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage)
    ? liquidationPriceForFees
    : liquidationPriceForMaxLeverage;
};
