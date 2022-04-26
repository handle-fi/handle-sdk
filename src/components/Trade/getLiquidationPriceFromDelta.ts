import { GetLiquidationArgs } from "./types";

export const getLiquidationPriceFromDelta = ({
  liquidationAmount,
  size,
  collateral,
  averagePrice,
  isLong
}: GetLiquidationArgs) => {
  if (liquidationAmount.gt(collateral)) {
    const liquidationDelta = liquidationAmount.sub(collateral);
    const priceDelta = liquidationDelta.mul(averagePrice).div(size);
    return !isLong ? averagePrice.sub(priceDelta) : averagePrice.add(priceDelta);
  }

  const liquidationDelta = collateral.sub(liquidationAmount);
  const priceDelta = liquidationDelta.mul(averagePrice).div(size);

  return isLong ? averagePrice.sub(priceDelta) : averagePrice.add(priceDelta);
};
