import { ethers } from "ethers";
import { HlpInfoMethods } from "../../../src/components/Trade/types";
import { PRICE_DECIMALS } from "../../../src/config/hlp";

export const FIVE_DOLLARS = ethers.utils.parseUnits("5", PRICE_DECIMALS);
export const ONE_DOLLAR = ethers.utils.parseUnits("1", PRICE_DECIMALS);

export const sampleHlpTokenMethods: HlpInfoMethods = {
  getMinPrice: () => ONE_DOLLAR,
  getMaxPrice: () => ONE_DOLLAR,
  getAveragePrice: () => ONE_DOLLAR,
  getFundingRate: () => ethers.constants.One,
  getTokenInfo: () => undefined,
  getUsdHlpSupply: () => ethers.constants.One,
  getTargetUsdHlpAmount: () => ethers.constants.One,
  getTotalTokenWeights: () => ethers.constants.One,
  getHlpPrice: () => FIVE_DOLLARS
};
