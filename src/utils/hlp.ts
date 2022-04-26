import { HLP_CONTRACTS, HLP_TOKENS } from "../hlp-config";
import { DEFAULT_HLP_NETWORK } from "../hlp-config";

export const getPerpTokenSymbols = (network = DEFAULT_HLP_NETWORK): string[] =>
  HLP_TOKENS[network]?.map((x) => x.symbol) || [];

export const isPerpTokenBySymbol = (symbol: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.some((x) => x.symbol === symbol);

export const isPerpTokenByAddress = (address: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.some((x) => x.address === address);

export const getPerpTokenBySymbol = (symbol: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.find((x) => x.symbol === symbol);

export const getPerpTokenByAddress = (address: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.find((x) => x.address === address);

export const getHlpToken = (network = DEFAULT_HLP_NETWORK) => ({
  name: "handle liquidity token",
  symbol: "hLP",
  decimals: 18,
  displayDecimals: 4,
  address: HLP_CONTRACTS[network].HLP,
  icon: null
});

export const getNativeWrappedToken = (network = DEFAULT_HLP_NETWORK) => {
  const nativeToken = HLP_TOKENS[network]?.find((x) => x.isNative);
  return HLP_TOKENS[network]?.find((x) => x.isWrapped && x.baseSymbol === nativeToken?.symbol);
};
