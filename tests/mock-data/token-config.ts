import { ethers } from "hardhat";
import { exit } from "process";
import { DEFAULT_TOKEN_LIST_URLS } from "../../src/components/TokenManager";
import HandleTokenManager from "../../src/components/TokenManager/HandleTokenManager";
import { BASIS_POINTS_DIVISOR, HlpConfig, PRICE_DECIMALS } from "../../src/config/hlp";
import { loadTokens } from "../suites/convert/test-tokens";

export const testTokenList = new HandleTokenManager(DEFAULT_TOKEN_LIST_URLS);

export const TEST_CONFIG: HlpConfig = {
  marginFeeBasisPoints: 10,
  swapFeeBasisPoints: 20,
  stableSwapFeeBasisPoints: 1,
  maxLeverage: 50 * BASIS_POINTS_DIVISOR,
  mintBurnFeeBasisPoints: 20,
  taxBasisPoints: 10,
  stableTaxBasisPoints: 5,
  minProfitTime: 60,
  liquidationFee: ethers.utils.parseUnits("2", PRICE_DECIMALS)
};

testTokenList.initialLoad
  .then(async () => {
    loadTokens();
    run();
  })
  .catch((e) => {
    console.error(e);
    exit(1);
  });
