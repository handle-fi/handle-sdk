import { HLP_TOKENS } from "../../config/hlp-config";
import { Network } from "../../types/network";

// Map ETH to WETH address if needed. (ETH may be 0xEEE... or 0x000...).
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
