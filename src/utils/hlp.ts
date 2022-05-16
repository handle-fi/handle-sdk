import { HLP_CONTRACTS, HLP_IMAGE_URL, HLP_TOKENS } from "../config/hlp";
import { DEFAULT_HLP_NETWORK } from "../config/hlp";
import { Network } from "../types/network";
import { TokenExtended } from "../types/tokens";

export const getHlpTokenSymbols = (network = DEFAULT_HLP_NETWORK): string[] =>
  HLP_TOKENS[network]?.map((x) => x.symbol) || [];

export const isHlpTokenBySymbol = (symbol: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.some((x) => x.symbol === symbol);

export const isHlpTokenByAddress = (address: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.some((x) => x.address === address);

export const getHlpTokenBySymbol = (symbol: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.find((x) => x.symbol === symbol);

export const getHlpTokenByAddress = (address: string, network = DEFAULT_HLP_NETWORK) =>
  HLP_TOKENS[network]?.find((x) => x.address === address);

export const isHlpSupportedToken = (symbol: string, network: Network) => {
  return HLP_TOKENS[network].some((_token) => {
    return _token.symbol === symbol;
  });
};

export const getHlpToken = (network = DEFAULT_HLP_NETWORK): TokenExtended<string> | null => {
  const hlpAddress = HLP_CONTRACTS[network]?.HLP;
  if (!hlpAddress) return null;
  return {
    name: "handle liquidity token",
    symbol: "hLP",
    decimals: 18,
    displayDecimals: 4,
    address: hlpAddress,
    icon: HLP_IMAGE_URL
  };
};

export const getNativeWrappedToken = (network = DEFAULT_HLP_NETWORK) => {
  const nativeToken = HLP_TOKENS[network]?.find((x) => x.isNative);
  return HLP_TOKENS[network]?.find((x) => x.isWrapped && x.baseSymbol === nativeToken?.symbol);
};

export const tryParseNativeHlpToken = (
  token: { symbol: string; address: string },
  network: Network
): {
  address: string;
  isNative: boolean;
} => {
  const nativeSymbol = HLP_TOKENS[network].find((x) => x.isNative)?.symbol;
  if (!nativeSymbol) throw new Error("Can't find native token");
  const isNative = HLP_TOKENS[network].find((x) => x.symbol === token.symbol)?.isNative || false;
  if (!isNative) return { address: token.address, isNative };
  const wrappedAddress = HLP_TOKENS[network].find(
    (x) => x.isWrapped && x.baseSymbol === nativeSymbol
  )?.address;
  if (!wrappedAddress) throw new Error("Can't parse native hlp token: no wrapped token");
  return { address: wrappedAddress, isNative };
};
