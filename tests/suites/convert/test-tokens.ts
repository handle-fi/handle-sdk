import { TokenInfo } from "@uniswap/token-lists";
import { exit } from "process";
import { mustExist } from "../../../src/utils/general-utils";
import { testTokenList } from "../../mock-data/token-list";

export let weth: TokenInfo;
export let eth: TokenInfo;
export let hlp: TokenInfo;
export let fxUsd: TokenInfo;
export let fxAud: TokenInfo;
export let fxEur: TokenInfo;
export let eurs: TokenInfo;

export const loadTokens = () => {
  try {
    weth = mustExist(testTokenList.getHlpWrappedNativeToken("arbitrum"), "Weth on arbitrum");
    eth = mustExist(testTokenList.getNativeToken("arbitrum"), "ETH on arbitrum");
    hlp = mustExist(testTokenList.getTokenBySymbol("hLP", "arbitrum"), "hLP on arbitrum");
    fxUsd = mustExist(testTokenList.getTokenBySymbol("fxUSD", "arbitrum"), "fxUSD on arbitrum");
    fxAud = mustExist(testTokenList.getTokenBySymbol("fxAUD", "arbitrum"), "fxAUD on arbitrum");
    fxEur = mustExist(testTokenList.getTokenBySymbol("fxEUR", "arbitrum"), "fxEUR on arbitrum");
    eurs = mustExist(testTokenList.getTokenBySymbol("EURS", "arbitrum"), "EURS on arbitrum");
  } catch (e) {
    console.error(e);
    exit(1);
  }
};
