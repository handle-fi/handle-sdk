import { testTokenList } from "../../mock-data/token-list";

export const weth = testTokenList.getHlpWrappedNativeToken("arbitrum")!;
export const eth = testTokenList.getNativeToken("arbitrum")!;
export const hlp = testTokenList.getTokenBySymbol("hLP", "arbitrum")!;
export const fxUsd = testTokenList.getTokenBySymbol("fxUSD", "arbitrum")!;
export const fxAud = testTokenList.getTokenBySymbol("fxAUD", "arbitrum")!;

if (!weth || !eth || !hlp || !fxUsd || !fxAud) {
  throw new Error("missing tokens");
}
