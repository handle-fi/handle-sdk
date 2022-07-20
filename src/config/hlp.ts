import { BigNumber } from "ethers";
import { gql, request } from "graphql-request";
import config from ".";
import { Network, NetworkMap } from "../types/network";

/** Currently the only avaliable handle liquidity pool network */
export const DEFAULT_HLP_NETWORK: Network = "arbitrum";

export const HLP_IMAGE_URL = "https://app.handle.fi/assets/images/handle.fiLogoLightNewCut.png";
export const HANDLE_WEBSOCKET_URL = "wss://oracle.handle.fi/quotes";

/** hlp constants */
export const BASIS_POINTS_DIVISOR = 10_000;
export const USD_DISPLAY_DECIMALS = 2;
export const PRICE_DECIMALS = 30;
export const MIN_LEVERAGE = 1 * BASIS_POINTS_DIVISOR;
export const FUNDING_FEE_DIVISOR = BASIS_POINTS_DIVISOR;
export const FUNDING_RATE_PRECISION = 1_000_000;

/** Symbols that can be used in the hlp price chart against USD. */
export const UsdHlpChartSymbols = ["AUD", "JPY", "CNY", "EUR", "KRW", "BTC", "BNB", "ETH"] as const;
/** Symbols against the USD for perpetual trading. */
export type UsdPerpChartSymbol = typeof UsdHlpChartSymbols[number];

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

export type HlpContracts = {
  Vault: string;
  VaultUtils: string;
  Router: string;
  Reader: string;
  HlpManager: string;
  HLP: string;
  HlpManagerRouter: string;
};

/** Perp contracts for each network chain ID. */
export const HLP_CONTRACTS: NetworkMap<HlpContracts | undefined> = {
  // Arbitrum One
  arbitrum: {
    Vault: "0x1785e8491e7e9d771b2A6E9E389c25265F06326A",
    VaultUtils: "0xfC78dF3D64E14CF82d2aea52e416d85f8AB148E2",
    HlpManager: "0x034ABdFA4eADc7366f0852c00D88C1eC6cD190fE",
    Router: "0x851aBAD9A78609ef44dB07BfBBE55748731513A6",
    Reader: "0xCb7AEB7f471D1c19C78E3cd578ee5Ff0788278B6",
    HLP: "0xB666b08609b2E69A8ba51AA720770053AeC0d2d3",
    HlpManagerRouter: "0xe7EcFcA68aCEdf2aabd016Bc7C587Cc513dDeC22"
  },
  ethereum: undefined,
  polygon: undefined
};

const loadedConfig: Record<Network, HlpConfig | undefined> = {
  arbitrum: undefined,
  ethereum: undefined,
  polygon: undefined
};

/** hLP dynamic config */
export type HlpConfig = {
  maxLeverage: number;
  mintBurnFeeBasisPoints: number;
  taxBasisPoints: number;
  stableTaxBasisPoints: number;
  minProfitTime: number;
  marginFeeBasisPoints: number;
  swapFeeBasisPoints: number;
  stableSwapFeeBasisPoints: number;
  liquidationFee: BigNumber;
};

export const getLoadedConfig = async (
  network: Network,
  forceReload = false
): Promise<HlpConfig | undefined> => {
  if (!forceReload && loadedConfig[network]) return loadedConfig[network]!;
  if (network !== "arbitrum") return; // only supported on arbitrum

  type GraphResponse = {
    vaultFees: [
      {
        mintBurnFeeBasisPoints: string;
        taxBasisPoints: string;
        stableTaxBasisPoints: string;
        minProfitTime: string;
        marginFeeBasisPoints: string;
        swapFeeBasisPoints: string;
        stableSwapFeeBasisPoints: string;
        liquidationFee: string;
      }
    ];
    vaultMaxLeverages: [{ maxLeverage: string }];
  };

  const response: GraphResponse = await request(
    config.theGraphEndpoints.arbitrum.trade,
    gql`
      query {
        vaultFees(first: 1) {
          mintBurnFeeBasisPoints
          taxBasisPoints
          stableTaxBasisPoints
          minProfitTime
          marginFeeBasisPoints
          swapFeeBasisPoints
          stableSwapFeeBasisPoints
          liquidationFee
        }
        vaultMaxLeverages(first: 1) {
          maxLeverage
        }
      }
    `
  );

  if (!response) throw new Error("Config not found");
  if (!Array.isArray(response.vaultFees)) throw new Error("Vault fees not found");
  if (!Array.isArray(response.vaultMaxLeverages)) throw new Error("Vault max leverage not found");

  loadedConfig[network] = {
    mintBurnFeeBasisPoints: +response.vaultFees[0].mintBurnFeeBasisPoints,
    taxBasisPoints: +response.vaultFees[0].taxBasisPoints,
    stableTaxBasisPoints: +response.vaultFees[0].stableTaxBasisPoints,
    minProfitTime: +response.vaultFees[0].minProfitTime,
    marginFeeBasisPoints: +response.vaultFees[0].marginFeeBasisPoints,
    swapFeeBasisPoints: +response.vaultFees[0].swapFeeBasisPoints,
    stableSwapFeeBasisPoints: +response.vaultFees[0].stableSwapFeeBasisPoints,
    liquidationFee: BigNumber.from(response.vaultFees[0].liquidationFee),
    maxLeverage: +response.vaultMaxLeverages[0].maxLeverage
  };
  return loadedConfig[network]!;
};
