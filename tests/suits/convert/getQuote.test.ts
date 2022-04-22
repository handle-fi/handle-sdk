import { expect } from "chai";
import { ethers } from "ethers";
import Convert from "../../../src/components/Convert";
import { PerpInfoMethods } from "../../../src/components/Trade/types";
import { PERP_TOKENS, PRICE_DECIMALS } from "../../../src/perp-config";
import { getHlpToken, getNativeWrappedToken } from "../../../src/utils/perp";

const convert = new Convert();
const weth = getNativeWrappedToken("arbitrum")!; // arbitrum
const eth = PERP_TOKENS["arbitrum"].find((x) => x.isNative)!;
const hlp = getHlpToken("arbitrum");
const fxUsd = PERP_TOKENS["arbitrum"].find((x) => x.symbol === "fxUSD")!;

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
    it("should be 1-1 from eth to weth", async () => {
      const { quote, feeBasisPoints } = await convert.getQuote(
        {
          fromToken: weth,
          toToken: eth,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: "0x0000000000000000000000000000000000000000",
          fromAmount: ethers.constants.One,
          gasPrice: ethers.constants.One
        },
        samplePerpTokenMethods
      );
      expect(quote.sellAmount).to.eq(quote.buyAmount);
      expect(feeBasisPoints?.toNumber()).to.eq(0);
    });
    it("should be 1-1 from weth to eth", async () => {
      const { quote, feeBasisPoints } = await convert.getQuote(
        {
          fromToken: weth,
          toToken: eth,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: "0x0000000000000000000000000000000000000000",
          fromAmount: ethers.constants.One,
          gasPrice: ethers.constants.One
        },
        samplePerpTokenMethods
      );
      expect(quote.sellAmount).to.eq(quote.buyAmount);
      expect(feeBasisPoints?.toNumber()).to.eq(0);
    });
  });
  describe("hLP", () => {
    it("should correctly calculate from hlp to a token", async () => {
      const hlpPerpTokenMethods = {
        ...samplePerpTokenMethods,
        getHlpPrice: () => FIVE_DOLLARS,
        getMinPrice: () => ONE_DOLLAR,
        getMaxPrice: () => ONE_DOLLAR,
        getAveragePrice: () => ONE_DOLLAR
      };
      const { quote } = await convert.getQuote(
        {
          fromToken: hlp,
          toToken: fxUsd,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: "0x0000000000000000000000000000000000000000",
          fromAmount: ethers.utils.parseEther("1"),
          gasPrice: ethers.constants.One
        },
        hlpPerpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("1").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("5").toString());
    });
    it("should correctly calculate a token to hlp", async () => {
      const hlpPerpTokenMethods = {
        ...samplePerpTokenMethods,
        getHlpPrice: () => FIVE_DOLLARS,
        getMinPrice: () => ONE_DOLLAR,
        getMaxPrice: () => ONE_DOLLAR,
        getAveragePrice: () => ONE_DOLLAR
      };
      const { quote } = await convert.getQuote(
        {
          toToken: hlp,
          fromToken: fxUsd,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: "0x0000000000000000000000000000000000000000",
          fromAmount: ethers.utils.parseEther("5"),
          gasPrice: ethers.constants.One
        },
        hlpPerpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("1").toString());
    });
  });
});
