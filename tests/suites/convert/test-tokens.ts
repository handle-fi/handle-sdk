import { HLP_TOKENS } from "../../../src/config/hlp";
import { getHlpToken, getNativeWrappedToken } from "../../../src/utils/hlp";

export const weth = getNativeWrappedToken("arbitrum")!;
export const eth = HLP_TOKENS["arbitrum"].find((x) => x.isNative)!;
export const hlp = getHlpToken("arbitrum")!;
export const fxUsd = HLP_TOKENS["arbitrum"].find((x) => x.symbol === "fxUSD")!;
export const fxAud = HLP_TOKENS["arbitrum"].find((x) => x.symbol === "fxAUD")!;
