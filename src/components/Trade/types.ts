import { BigNumber } from "ethers";

export type PerpInfoMethods = {
  getMinPrice: (address: string) => BigNumber;
  getMaxPrice: (address: string) => BigNumber;
  getAveragePrice: (address: string) => BigNumber;
  getFundingRate: (address: string) => BigNumber;
  getTokenInfo: (address: string) => VaultTokenInfo | undefined;
  getUsdgSupply: () => BigNumber;
  getTargetUsdgAmount: (address: string) => BigNumber;
  getTotalTokenWeights: () => BigNumber;
  getHlpPrice: (isBuying: boolean) => BigNumber;
};

export type VaultTokenInfo = {
  poolAmount: BigNumber;
  reservedAmount: BigNumber;
  usdgAmount: BigNumber;
  tokenWeight: BigNumber;
  bufferAmount: BigNumber;
  maxUsdgAmount: BigNumber;
  minPrice: BigNumber;
  maxPrice: BigNumber;
  guaranteeUsd: BigNumber;
};

export type GetLiquidationArgs = {
  liquidationAmount: BigNumber;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  isLong: boolean;
};
