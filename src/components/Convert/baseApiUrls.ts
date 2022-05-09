import { Network, NetworkMap } from "../../types/network";

export const get0xBaseUrl = (network: Network) =>
  `https://${network === "ethereum" ? "" : network + "."}api.0x.org/swap/v1`;

export const get1InchBaseUrl = (network: Network) => {
  const networkNameToIdMap: NetworkMap<number> = {
    ethereum: 1,
    polygon: 137,
    arbitrum: 42161
  };
  return `https://api.1inch.exchange/v4.0/${networkNameToIdMap[network]}`;
};
