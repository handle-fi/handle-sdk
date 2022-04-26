import { ethers } from "ethers";
import { Network, SingleCollateralVaultNetwork } from ".";
import config from "./config";
import { NetworkMap } from "./types/network";

export const SECONDS_IN_A_YEAR_BN = ethers.BigNumber.from("60").mul("60").mul("24").mul("365");

export const NETWORK_NAME_TO_CHAIN_ID: NetworkMap<number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137
};

export const NETWORK_NAMES = Object.keys(NETWORK_NAME_TO_CHAIN_ID) as Network[];

export const SINGLE_COLLATERAL_NETWORK_NAMES = Object.keys(
  config.singleCollateralVaults
) as SingleCollateralVaultNetwork[];
