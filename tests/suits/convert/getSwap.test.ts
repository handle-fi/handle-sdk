import { expect } from "chai";
import { ethers } from "ethers";
import { Network } from "../../../src";
import Convert from "../../../src/components/Convert";
import { PerpInfoMethods } from "../../../src/components/Trade/types";
import { PERP_TOKENS, PRICE_DECIMALS } from "../../../src/perp-config";
import { getHlpToken, getNativeWrappedToken } from "../../../src/utils/perp";
import { getTokenDetails } from "../../../src/utils/token-utils";

const convert = new Convert();
const weth = getNativeWrappedToken("arbitrum")!; // arbitrum
const eth = PERP_TOKENS["arbitrum"].find((x) => x.isNative)!;
const hlp = getHlpToken("arbitrum");
const fxUsd = PERP_TOKENS["arbitrum"].find((x) => x.symbol === "fxUSD")!;
const fxAud = PERP_TOKENS["arbitrum"].find((x) => x.symbol === "fxAUD")!;

const FIVE_DOLLARS = ethers.utils.parseUnits("5", PRICE_DECIMALS);
const ONE_DOLLAR = ethers.utils.parseUnits("1", PRICE_DECIMALS);

const samplePerpTokenMethods: PerpInfoMethods = {
  getMinPrice: () => ONE_DOLLAR,
  getMaxPrice: () => ONE_DOLLAR,
  getAveragePrice: () => ONE_DOLLAR,
  getFundingRate: () => ethers.constants.One,
  getTokenInfo: () => undefined,
  getUsdgSupply: () => ethers.constants.One,
  getTargetUsdgAmount: () => ethers.constants.One,
  getTotalTokenWeights: () => ethers.constants.One,
  getHlpPrice: () => FIVE_DOLLARS
};

describe("getQuote", () => {
  describe("WETH", () => {
    it("should be 1-1 from eth to weth", async () => {});
    it("should be 1-1 from weth to eth", async () => {});
  });
  describe("hLP", () => {
    it("should correctly calculate from hlp to a token", async () => {});
    it("should correctly calculate from hlp to eth ", async () => {});
    it("should correctly calculate a token to hlp", async () => {});
    it("should correctly calculate eth to hlp", async () => {});
  });
  describe("api", () => {
    (["arbitrum", "ethereum", "polygon"] as Network[]).forEach((network) => {
      it(`should return an api quote for ${network}`, async () => {});
    });
  });
  describe("handle liquidity pool", () => {
    it("should return a quote for two tokens", async () => {});
    it("should return a quote for a token and eth", async () => {});
  });
});
