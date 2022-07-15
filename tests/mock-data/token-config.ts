import { ethers } from "hardhat";
import { exit } from "process";
import { ConvertSDK } from "../../src";
import { DEFAULT_TOKEN_LIST_URLS } from "../../src/components/TokenManager";
import HandleTokenManager from "../../src/components/TokenManager/HandleTokenManager";
import { BASIS_POINTS_DIVISOR, HlpConfig, PRICE_DECIMALS } from "../../src/config/hlp";
import { loadTokens } from "../suites/convert/test-tokens";

export const testTokenList = new HandleTokenManager(DEFAULT_TOKEN_LIST_URLS);

export const TEST_CONFIG: HlpConfig = {
  MARGIN_FEE_BASIS_POINTS: 10,
  SWAP_FEE_BASIS_POINTS: 20,
  STABLE_SWAP_FEE_BASIS_POINTS: 1,
  MAX_LEVERAGE: 50 * BASIS_POINTS_DIVISOR,
  MINT_BURN_FEE_BASIS_POINTS: 20,
  TAX_BASIS_POINTS: 10,
  STABLE_TAX_BASIS_POINTS: 5,
  MIN_PROFIT_TIME: 60,
  LIQUIDATION_FEE: ethers.utils.parseUnits("2", PRICE_DECIMALS)
};

testTokenList.initialLoad
  .then(async () => {
    loadTokens();
    ConvertSDK.setConfig(TEST_CONFIG);
    run();
  })
  .catch((e) => {
    console.error(e);
    exit(1);
  });
