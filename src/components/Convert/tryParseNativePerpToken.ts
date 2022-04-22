import { PERP_TOKENS } from "../../perp-config";
import { Network } from "../../types/network";

// Map ETH to WETH address if needed. (ETH may be 0xEEE... or 0x000...).
export const tryParseNativePerpToken = (
  token: { symbol: string; address: string },
  network: Network
): {
  address: string;
  isNative: boolean;
} => {
  const nativeSymbol = PERP_TOKENS[network].find((x) => x.isNative)?.symbol;
  if (!nativeSymbol) throw new Error("Can't find native token");
  const isNative = PERP_TOKENS[network].find((x) => x.symbol === token.symbol)?.isNative || false;
  if (!isNative) return { address: token.address, isNative };
  const wrappedAddress = PERP_TOKENS[network].find(
    (x) => x.isWrapped && x.baseSymbol === nativeSymbol
  )?.address;
  if (!wrappedAddress) throw new Error("Can't parse native perp token: no wrapped token");
  return { address: wrappedAddress, isNative };
};
