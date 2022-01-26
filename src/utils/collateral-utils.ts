import { Collateral, CollateralSymbol, CollateralSymbolMap } from "../types/collaterals";

export const getCollateralTokenSymbolFromAddress = (
  address: string,
  config: CollateralSymbolMap<string>
): CollateralSymbol => {
  const keys = Object.keys(config) as CollateralSymbol[];

  return keys.find((k) => {
    const symbol = k as CollateralSymbol;
    return config[symbol].toLowerCase() === address.toLowerCase();
  })!;
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
