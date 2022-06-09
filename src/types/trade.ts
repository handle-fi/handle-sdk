import {BigNumber} from "ethers";

export type HlpInfoMethods = {
  getMinPrice: (address: string) => BigNumber;
  getMaxPrice: (address: string) => BigNumber;
  getFundingRate: (address: string) => BigNumber;
  getTokenInfo: (address: string) => VaultTokenInfo | undefined;
  getUsdHlpSupply: () => BigNumber;
  getTargetUsdHlpAmount: (address: string) => BigNumber;
  getTotalTokenWeights: () => BigNumber;
  getHlpPrice: (isBuying: boolean) => BigNumber;
};

export type HlpData = {
  infoMethods: HlpInfoMethods;
  signedQuotes: SignedQuote[];
};

export type SignedQuote = {
  /// The quote pair. eg: AUD/USD
  pair: string;
  signatureParams: SignedQuoteParams;
  signature: Uint8Array;
};

export type SignedQuoteParams = {
  /// The value of the quote, with 8 decimals. eg: 100000000 for 1 AUD/USD
  value: BigNumber;
  signedTimestamp: BigNumber;
  chainId: number;
  validFromTimestamp: BigNumber;
  durationSeconds: BigNumber;
};

export type VaultTokenInfo = {
  poolAmount: BigNumber;
  reservedAmount: BigNumber;
  usdHlpAmount: BigNumber;
  tokenWeight: BigNumber;
  bufferAmount: BigNumber;
  maxUsdHlpAmount: BigNumber;
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
