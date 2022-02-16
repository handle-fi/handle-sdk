import { ethers } from "ethers";
import config from "../config";
import { Network } from "../types/network";

export const getNetworkName = (network: ethers.providers.Network): Network => {
  const result = Object.entries(config.networkNameToId).find(([_networkName, networkId]) => {
    return network.chainId === networkId;
  });

  return (result ? result[0] : network.name) as Network;
};
