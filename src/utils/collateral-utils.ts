import { CollateralDetails } from "../config";
import { Collateral, CollateralSymbol, CollateralToken } from "../types/collaterals";

export const getTokensFromConfig = (
  details: Partial<CollateralDetails>
): Partial<CollateralToken> => {
  return (Object.keys(details) as []).map((key) => {
    const k = key as CollateralSymbol;
    const detail = (details as CollateralDetails)[k];

    return {
      symbol: key,
      ...detail
    };
  });
};

export const getCollateralByAddress = (collaterals: Collateral[], address: string): Collateral => {
  const collateral = collaterals.find(
    (collateral) => collateral.address.toLowerCase() === address.toLowerCase()
  );

  if (!collateral) {
    throw new Error(`Could not find collateral: ${address}`);
  }

  return collateral;
};

export const getCollateralBySymbol = (
  collaterals: Collateral[],
  symbol: CollateralSymbol
): Collateral => {
  const collateral = collaterals.find((collateral) => collateral.symbol === symbol);

  if (!collateral) {
    throw new Error(`Could not find collateral: ${symbol}`);
  }

  return collateral;
};
