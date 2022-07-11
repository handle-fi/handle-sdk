import { ethers } from "ethers";
import { HlpConfig, Network } from ".";

export const SECONDS_IN_A_YEAR_BN = ethers.BigNumber.from("60").mul("60").mul("24").mul("365");

export const NETWORK_NAME_TO_CHAIN_ID: Record<Network, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137
};

export const CHAIN_ID_TO_NETWORK_NAME: Record<number, Network> = {
  1: "ethereum",
  42161: "arbitrum",
  137: "polygon"
};

export const NETWORK_NAMES = Object.keys(NETWORK_NAME_TO_CHAIN_ID) as Network[];

// This is hard coded in the curve deployer. 1e8 is equal to 1%.
export const CURVE_FEE_DENOMINATOR = 1e8;
// This will not overflow, as this is equal to 1e10, max safe integer is ~1e16
export const CURVE_FEE_BASIS_POINTS = CURVE_FEE_DENOMINATOR * HlpConfig.BASIS_POINTS_DIVISOR * 0.01;
