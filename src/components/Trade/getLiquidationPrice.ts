import { BigNumber, ethers } from "ethers";
import { BASIS_POINTS_DIVISOR, LIQUIDATION_FEE, MAX_LEVERAGE } from "../../hlp-config";
import { getLiquidationPriceFromDelta } from "./getLiquidationPriceFromDelta";
import { getPositionFee } from "./getPositionFee";

type LiquidationData = {
  isLong: boolean;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
};

export const getLiquidationPrice = (data: LiquidationData) => {
  const { isLong, size, collateral, averagePrice } = data;
  if (size.isZero()) return ethers.constants.Zero;
  let positionFee = getPositionFee(size).add(LIQUIDATION_FEE);

  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: positionFee,
    size,
    collateral,
    averagePrice,
    isLong
  });

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: size.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE),
    size,
    collateral,
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
