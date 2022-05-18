import HandleTokenManager from "../components/TokenManager/HandleTokenManager";
import { Collateral, CollateralSymbol, CollateralToken } from "../types/collaterals";

export const getTokensFromConfig = (addresses: string[]): CollateralToken[] => {
  const tokenManager = new HandleTokenManager();
  return tokenManager.getTokensByAddresses(addresses) as CollateralToken[];
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
