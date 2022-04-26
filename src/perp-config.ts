import { BigNumber } from "ethers";
import config from "./config";
import { Network } from "./types/network";

/** Swap function gas limit for Arbitrum. */
export const PERP_SWAP_GAS_LIMIT = "1500000";

/** Currently the only avaliable perp network */
export const DEFAULT_PERP_NETWORK: Network = "arbitrum";

/** perp constants */
export const BASIS_POINTS_DIVISOR = 10_000;
export const USD_DISPLAY_DECIMALS = 2;
export const MARGIN_FEE_BASIS_POINTS = 10;
export const SWAP_FEE_BASIS_POINTS = 20;
export const STABLE_SWAP_FEE_BASIS_POINTS = 1;
export const PRICE_DECIMALS = 30;
export const LIQUIDATION_FEE = BigNumber.from(5).mul(BigNumber.from(10).pow(PRICE_DECIMALS));
export const MAX_LEVERAGE = 100 * BASIS_POINTS_DIVISOR;
export const MIN_LEVERAGE = 2.5 * BASIS_POINTS_DIVISOR;
export const FUNDING_FEE_DIVISOR = BASIS_POINTS_DIVISOR;
export const FUNDING_RATE_PRECISION = 100_000;
export const MINT_BURN_FEE_BASIS_POINTS = 20;
export const TAX_BASIS_POINTS = 10;
export const STABLE_TAX_BASIS_POINTS = 5;

/** Symbols that can be used in the perp price chart against USD. */
export const UsdPerpChartSymbols = [
  "AUD",
  "JPY",
  "CNY",
  "EUR",
  "KRW",
  "BTC",
  "BNB",
  "ETH"
] as const;
/** Symbols against the USD for perpetual trading. */
export type UsdPerpChartSymbol = typeof UsdPerpChartSymbols[number];

/**
 * Map from symbol to subgraph entity ID for Chainlink aggregator.
 * Used to fetch historic price data from Chainlink's subgraph.
 */
export const CHAINLINK_GQL_FEED_ID_MAP: { [key: string]: string } = {
  BTC_USD: "0xae74faa92cb67a95ebcab07358bc222e33a34da7",
  ETH_USD: "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
  BNB_USD: "0xc45ebd0f901ba6b2b8c7e70b717778f055ef5e6d",
  AUD_USD: "0x23641e6957805a800ca1e5339813e05ee35ede77",
  EUR_USD: "0x02f878a94a1ae1b15705acd65b5519a46fe3517e",
  KRW_USD: "0x256b6e10c153b49ac7800e2603167026f75eb765",
  PHP_USD: "0x835e3a06e4889030d059495f075d73781383e2b7",
  JPY_USD: "0x01a1f73b1f4726eb6eb189ffa5cbb91af8e14025",
  CNY_USD: "0x673816c92ec977003eb2e6e5ba5d7ef1a4ef6c4a"
};

export type PerpContracts = {
  Vault: string;
  VaultUtils: string;
  Router: string;
  Reader: string;
  HlpManager: string;
  HLP: string;
  HlpManagerRouter: string;
};

export type PerpToken = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  isStable?: boolean;
  isNative?: boolean;
  isShortable?: boolean;
  isWrapped?: boolean;
  /** Only used if isWrapped is true */
  baseSymbol?: string;
};

// TODO: use network name, with NetworkMap<T>, instead of chainId.
/** Perp contracts for each network chain ID. */
export const PERP_CONTRACTS: Record<Network, PerpContracts> = {
  // Arbitrum One
  arbitrum: {
    Vault: "0x1785e8491e7e9d771b2A6E9E389c25265F06326A",
    VaultUtils: "0xfC78dF3D64E14CF82d2aea52e416d85f8AB148E2",
    HlpManager: "0x034ABdFA4eADc7366f0852c00D88C1eC6cD190fE",
    Router: "0xa3815EB3D81f45634E33fBC67CD0C1177Ba3A131",
    Reader: "0xCb7AEB7f471D1c19C78E3cd578ee5Ff0788278B6",
    HLP: "0xB666b08609b2E69A8ba51AA720770053AeC0d2d3",
    HlpManagerRouter: "0x3ecB21eABEF68a237862E8A003807eE4Fa47509b"
  },
  ethereum: {
    Vault: "NONE_DEPLOYED",
    VaultUtils: "NONE_DEPLOYED",
    HlpManager: "NONE_DEPLOYED",
    Router: "NONE_DEPLOYED",
    Reader: "NONE_DEPLOYED",
    HLP: "NONE_DEPLOYED",
    HlpManagerRouter: "NONE_DEPLOYED"
  },
  polygon: {
    Vault: "NONE_DEPLOYED",
    VaultUtils: "NONE_DEPLOYED",
    HlpManager: "NONE_DEPLOYED",
    Router: "NONE_DEPLOYED",
    Reader: "NONE_DEPLOYED",
    HLP: "NONE_DEPLOYED",
    HlpManagerRouter: "NONE_DEPLOYED"
  }
};

export const PERP_CHAIN_TO_NETWORK: { [chainId: number]: Network } = {
  42161: "arbitrum"
};

/** Tokens configured in the Vault contract. */
export const PERP_TOKENS: Record<Network, PerpToken[]> = {
  // Arbitrum One
  arbitrum: [
    {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
      address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      isNative: true,
      isShortable: true
    },
    {
      name: "Wrapped ETH",
      symbol: "WETH",
      decimals: 18,
      address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      isWrapped: true,
      baseSymbol: "ETH"
    },
    {
      name: "handle USD",
      symbol: "fxUSD",
      decimals: 18,
      address: config.fxTokenAddresses.fxUSD,
      isStable: true
    },
    {
      name: "handle AUD",
      symbol: "fxAUD",
      decimals: 18,
      address: config.fxTokenAddresses.fxAUD,
      isShortable: true
    },
    {
      name: "handle EUR",
      symbol: "fxEUR",
      decimals: 18,
      address: config.fxTokenAddresses.fxEUR,
      isShortable: true
    },
    {
      name: "handle PHP",
      symbol: "fxPHP",
      decimals: 18,
      address: config.fxTokenAddresses.fxPHP,
      isShortable: true
    },
    {
      name: "handle CNY",
      symbol: "fxCNY",
      decimals: 18,
      address: "0x2C29daAce6Aa05e3b65743EFd61f8A2C448302a3",
      isShortable: true
    },
    {
      name: "handle KRW",
      symbol: "fxKRW",
      decimals: 18,
      address: "0xF4E8BA79d058fFf263Fd043Ef50e1010c1BdF991",
      isShortable: true
    },
    {
      name: "handle CHF",
      symbol: "fxCHF",
      decimals: 18,
      address: "0x8C414cB8A9Af9F7B03673e93DF73c23C1aa05b4e",
      isShortable: true
    }
  ],
  ethereum: [],
  polygon: []
};

export const getPerpTokenSymbols = (network: Network): string[] =>
  PERP_TOKENS[network]?.map((x) => x.symbol) || [];

/** hLP token information. */
export const hLP = {
  name: "handle Liquidity Pool",
  symbol: "hLP",
  decimals: 18,
  isStable: true
};

export const getHLPToken = (network: Network) => ({
  ...hLP,
  address: PERP_CONTRACTS[network]?.HLP
});
