import { ethers } from "ethers";
import { Network, SingleCollateralVaultNetwork } from ".";
import config from "./config";

export const SECONDS_IN_A_YEAR_BN = ethers.BigNumber.from("60").mul("60").mul("24").mul("365");

export const NETWORK_NAMES = Object.keys(config.networkNameToId) as Network[];
export const SINGLE_COLLATERAL_NETWORK_NAMES = Object.keys(
  config.singleCollateralVaults
) as SingleCollateralVaultNetwork[];
