import { PERP_CONTRACTS, PERP_TOKENS } from "../perp-config";
import { DEFAULT_PERP_NETWORK } from "../perp-config";

export const getPerpTokenSymbols = (network = DEFAULT_PERP_NETWORK): string[] =>
  PERP_TOKENS[network]?.map((x) => x.symbol) || [];

export const isPerpTokenBySymbol = (symbol: string, network = DEFAULT_PERP_NETWORK) =>
  PERP_TOKENS[network]?.some((x) => x.symbol === symbol);

export const isPerpTokenByAddress = (address: string, network = DEFAULT_PERP_NETWORK) =>
  PERP_TOKENS[network]?.some((x) => x.address === address);

export const getPerpTokenBySymbol = (symbol: string, network = DEFAULT_PERP_NETWORK) =>
  PERP_TOKENS[network]?.find((x) => x.symbol === symbol);

export const getPerpTokenByAddress = (address: string, network = DEFAULT_PERP_NETWORK) =>
  PERP_TOKENS[network]?.find((x) => x.address === address);

export const getHlpToken = (network = DEFAULT_PERP_NETWORK) => ({
  name: "handle liquidity token",
  symbol: "hLP",
  decimals: 18,
  displayDecimals: 4,
  address: PERP_CONTRACTS[network].HLP,
  icon: null
});

export const getNativeWrappedToken = (network = DEFAULT_PERP_NETWORK) => {
  const nativeToken = PERP_TOKENS[network]?.find((x) => x.isNative);
  return PERP_TOKENS[network]?.find((x) => x.isWrapped && x.baseSymbol === nativeToken?.symbol);
};
