import { BigNumber, ethers } from "ethers";
import { Vault__factory } from "../contracts";
import { Network, NetworkMap } from "../types/network";

/** Currently the only avaliable handle liquidity pool network */
export const DEFAULT_HLP_NETWORK: Network = "arbitrum";

export const HLP_IMAGE_URL = "https://app.handle.fi/assets/images/handle.fiLogoLightNewCut.png";
export const HANDLE_WEBSOCKET_URL = "wss://oracle.handle.fi/quotes";

/** hlp constants */
export const BASIS_POINTS_DIVISOR = 10_000;
export const USD_DISPLAY_DECIMALS = 2;
export const MARGIN_FEE_BASIS_POINTS = 10;
export const SWAP_FEE_BASIS_POINTS = 20;
export const STABLE_SWAP_FEE_BASIS_POINTS = 1;
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

/** hLP dynamic config */
type HlpDynamicConfig = {
  MAX_LEVERAGE: number;
  MINT_BURN_FEE_BASIS_POINTS: number;
  TAX_BASIS_POINTS: number;
  STABLE_TAX_BASIS_POINTS: number;
  MIN_PROFIT_TIME: number;
  MARGIN_FEE_BASIS_POINTS: number;
  SWAP_FEE_BASIS_POINTS: number;
  STABLE_SWAP_FEE_BASIS_POINTS: number;
  LIQUIDATION_FEE: BigNumber;
};

export const loadHlpDynamicConfig = async (
  provider: ethers.providers.Provider,
  network: Network
): Promise<HlpDynamicConfig> => {
  const contracts = HLP_CONTRACTS[network];
  if (!contracts) throw new Error("No hLP on this network");

  const vault = Vault__factory.connect(contracts.Vault, provider);
  const [
    MAX_LEVERAGE,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    STABLE_TAX_BASIS_POINTS,
    MIN_PROFIT_TIME,
    MARGIN_FEE_BASIS_POINTS,
    SWAP_FEE_BASIS_POINTS,
    STABLE_SWAP_FEE_BASIS_POINTS,
    LIQUIDATION_FEE
  ] = await Promise.all([
    vault.maxLeverage(),
    vault.mintBurnFeeBasisPoints(),
    vault.taxBasisPoints(),
    vault.stableTaxBasisPoints(),
    vault.minProfitTime(),
    vault.marginFeeBasisPoints(),
    vault.swapFeeBasisPoints(),
    vault.stableSwapFeeBasisPoints(),
    vault.liquidationFeeUsd()
  ]);
  return {
    MAX_LEVERAGE: MAX_LEVERAGE.toNumber(),
    MINT_BURN_FEE_BASIS_POINTS: MINT_BURN_FEE_BASIS_POINTS.toNumber(),
    TAX_BASIS_POINTS: TAX_BASIS_POINTS.toNumber(),
    STABLE_TAX_BASIS_POINTS: STABLE_TAX_BASIS_POINTS.toNumber(),
    MIN_PROFIT_TIME: MIN_PROFIT_TIME.toNumber(),
    MARGIN_FEE_BASIS_POINTS: MARGIN_FEE_BASIS_POINTS.toNumber(),
    SWAP_FEE_BASIS_POINTS: SWAP_FEE_BASIS_POINTS.toNumber(),
    STABLE_SWAP_FEE_BASIS_POINTS: STABLE_SWAP_FEE_BASIS_POINTS.toNumber(),
    LIQUIDATION_FEE
  };
};
