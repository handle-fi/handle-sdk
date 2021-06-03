import fs from "fs";
import path from "path";
import util from "util";
import config from "../../config.json";
import { ethers } from "ethers";

export enum Abi {
  Handle = "Handle",
  Comptroller = "Comptroller",
  ERC20 = "ERC20",
  fxKeeperPool = "fxKeeperPool",
  Treasury = "Treasury",
  VaultLibrary = "VaultLibrary"
}

export class Config {
  static getNetworkHandleAddress(network: string): string {
    let address = config.networks.find((x) => x.name == network)?.handleAddress;
    if (!address) throw new Error(`Network "${network}" is not supported`);
    return address;
  }

  static async getAbi(abi: Abi): Promise<ethers.ContractInterface> {
    const filePath = path.join(config.abiPath, abi, ".json");
    const file = await util.promisify(fs.readFile)(filePath, { encoding: "utf-8" });
    if (file == null) throw new Error(`Could not find ABI file at path "${filePath}"`);
    return file;
  }
}
