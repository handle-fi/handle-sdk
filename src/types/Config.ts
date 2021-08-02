import config from "../../config.json";
import { ethers } from "ethers";
import Comptroller from "../../abi/Comptroller.json";
import ERC20 from "../../abi/ERC20.json";
import fxKeeperPool from "../../abi/fxKeeperPool.json";
import Handle from "../../abi/Handle.json";
import Treasury from "../../abi/Treasury.json";
import VaultLibrary from "../../abi/VaultLibrary.json";

export enum Abi {
  Handle = "Handle",
  Comptroller = "Comptroller",
  ERC20 = "ERC20",
  fxKeeperPool = "fxKeeperPool",
  Treasury = "Treasury",
  VaultLibrary = "VaultLibrary"
}

const abi = {
  [Abi.Comptroller]: Comptroller,
  [Abi.ERC20]: ERC20,
  [Abi.fxKeeperPool]: fxKeeperPool,
  [Abi.Handle]: Handle,
  [Abi.Treasury]: Treasury,
  [Abi.VaultLibrary]: VaultLibrary
};

type NetworkConfig = {
  name: string;
  theGraphEndpoint?: string;
  handleAddress?: string;
};

export class Config {
  static getNetworkConfig(network: ethers.providers.Network): NetworkConfig {
    const configObject = config.networks.find((x) => x.chainId === network.chainId);
    if (!configObject) throw new Error(`Network "${network}" is not supported`);
    return configObject;
  }

  static async getAbi(option: Abi): Promise<ethers.ContractInterface> {
    return abi[option].abi;
  }
}
