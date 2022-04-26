import { ethers } from "ethers";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";
import { Network } from "../types/network";

export const getNetworkName = (network: ethers.providers.Network): Network => {
  const result = Object.entries(NETWORK_NAME_TO_CHAIN_ID).find(([_networkName, networkId]) => {
    return network.chainId === networkId;
  });

  return (result ? result[0] : network.name) as Network;
};
