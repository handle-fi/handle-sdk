import { providers, Signer } from "ethers";
import { HlpConfig } from "../..";
import { HPSM__factory } from "../../contracts/factories/HPSM__factory";
import { Network } from "../../types/network";

const pegCache: Record<Network, Record<string, boolean>> = {
  arbitrum: {},
  ethereum: {},
  polygon: {}
};

export const isTokenPegged = async (
  fxToken: string,
  pegToken: string,
  provider: Signer | providers.Provider,
  network: Network
): Promise<boolean> => {
  const cacheKey = `${fxToken}-${pegToken}`;
  if (pegCache[network][cacheKey] !== undefined) {
    return pegCache[network][cacheKey];
  }
  const hpsmAddress = HlpConfig.HLP_CONTRACTS[network]?.HPSM;
  if (!hpsmAddress) {
    return false;
  }
  const hpsm = HPSM__factory.connect(hpsmAddress, provider);
  const isPegged = await hpsm.isFxTokenPegged(fxToken, pegToken);
  pegCache[network][cacheKey] = isPegged;
  return isPegged;
};
