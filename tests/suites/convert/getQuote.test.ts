import { expect } from "chai";
import { ethers } from "ethers";
import { HlpConfig, Network } from "../../../src";
import Convert from "../../../src/components/Convert";
import { HlpInfoMethods } from "../../../src/components/Trade/types";
import { HLP_TOKENS, PRICE_DECIMALS } from "../../../src/config/hlp";
import { getHlpToken, getNativeWrappedToken } from "../../../src/utils/hlp";
import { getTokenDetails } from "../../../src/utils/token-utils";

const convert = new Convert();
const weth = getNativeWrappedToken("arbitrum")!;
const eth = HLP_TOKENS["arbitrum"].find((x) => x.isNative)!;
const hlp = getHlpToken("arbitrum")!;
const fxUsd = HLP_TOKENS["arbitrum"].find((x) => x.symbol === "fxUSD")!;
const fxAud = HLP_TOKENS["arbitrum"].find((x) => x.symbol === "fxAUD")!;

const FIVE_DOLLARS = ethers.utils.parseUnits("5", PRICE_DECIMALS);
const ONE_DOLLAR = ethers.utils.parseUnits("1", PRICE_DECIMALS);

const sampleHlpTokenMethods: HlpInfoMethods = {
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

const arbitrumProvider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");

describe("convert getQuote", () => {
  describe("WETH", () => {
    it("should be 1-1 from eth to weth", async () => {
      const { quote, feeBasisPoints } = await convert.getQuote(
        {
          fromToken: weth,
          toToken: eth,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.constants.One,
          gasPrice: ethers.constants.One
        },
        sampleHlpTokenMethods
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
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.constants.One,
          gasPrice: ethers.constants.One
        },
        sampleHlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(quote.buyAmount);
      expect(feeBasisPoints?.toNumber()).to.eq(0);
    });
  });
  describe("hLP", () => {
    it("should correctly calculate from hlp to a token", async () => {
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
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
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("1"),
          gasPrice: ethers.constants.One
        },
        hlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("1").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("5").toString());
    });
    it("should correctly calculate from hlp to eth ", async () => {
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
        getHlpPrice: () => FIVE_DOLLARS,
        getMinPrice: () => ONE_DOLLAR,
        getMaxPrice: () => ONE_DOLLAR,
        getAveragePrice: () => ONE_DOLLAR
      };
      const { quote } = await convert.getQuote(
        {
          fromToken: hlp,
          toToken: eth,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("1"),
          gasPrice: ethers.constants.One
        },
        hlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("1").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("5").toString());
    });
    it("should correctly calculate a token to hlp", async () => {
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
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
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("5"),
          gasPrice: ethers.constants.One
        },
        hlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("1").toString());
    });
    it("should correctly calculate eth to hlp", async () => {
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
        getHlpPrice: () => FIVE_DOLLARS,
        getMinPrice: () => ONE_DOLLAR,
        getMaxPrice: () => ONE_DOLLAR,
        getAveragePrice: () => ONE_DOLLAR
      };
      const { quote } = await convert.getQuote(
        {
          toToken: hlp,
          fromToken: eth,
          canUseHlp: false,
          network: "arbitrum",
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("5"),
          gasPrice: ethers.constants.One
        },
        hlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("1").toString());
    });
  });
  describe("api", () => {
    (["arbitrum", "ethereum", "polygon"] as Network[]).forEach((network) => {
      it(`should return an api quote for ${network}`, async () => {
        const usdc = getTokenDetails("USDC", network);
        const usdt = getTokenDetails("USDT", network);
        const { quote } = await convert.getQuote(
          {
            fromToken: { ...usdc, name: "" },
            toToken: { ...usdt, name: "" },
            canUseHlp: false,
            network,
            connectedAccount: ethers.constants.AddressZero,
            fromAmount: ethers.utils.parseEther("1"),
            gasPrice: ethers.constants.One
          },
          sampleHlpTokenMethods
        );
        expect(quote).to.have.property("buyAmount");
        expect(quote).to.have.property("sellAmount");
      });
    });
  });
  describe("handle liquidity pool", () => {
    it("should return a quote for two tokens", async () => {
      const getPrice = (address: string) => {
        if (address === fxAud.address) {
          return ethers.utils.parseUnits("0.5", PRICE_DECIMALS);
        } else {
          return ethers.utils.parseUnits("1", PRICE_DECIMALS);
        }
      };
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
        getMinPrice: getPrice,
        getMaxPrice: getPrice,
        getAveragePrice: getPrice
      };
      const { quote } = await convert.getQuote(
        {
          toToken: fxAud,
          fromToken: fxUsd,
          canUseHlp: true,
          network: "arbitrum",
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("5"),
          gasPrice: ethers.constants.One
        },
        hlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("10").toString());
    });
    it("should return a quote for a token and eth", async () => {
      const getPrice = (address: string) => {
        if (address === fxAud.address) {
          return ethers.utils.parseUnits("0.5", PRICE_DECIMALS);
        } else {
          return ethers.utils.parseUnits("1", PRICE_DECIMALS);
        }
      };
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
        getMinPrice: getPrice,
        getMaxPrice: getPrice,
        getAveragePrice: getPrice
      };
      const { quote } = await convert.getQuote(
        {
          toToken: fxAud,
          fromToken: eth,
          canUseHlp: true,
          network: "arbitrum",
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("5"),
          gasPrice: ethers.constants.One
        },
        hlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("10").toString());
    });
  });
  describe("hPSM", () => {
    it("should return a quote for pegged tokens", async () => {
      // fxUSD is assumed to be pegged to USDT
      const usdt = getTokenDetails("USDT", "arbitrum");
      const { quote } = await convert.getQuote(
        {
          toToken: { ...usdt, name: "" },
          fromToken: fxUsd,
          canUseHlp: true,
          network: "arbitrum",
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("5"),
          gasPrice: ethers.constants.One,
          provider: arbitrumProvider
        },
        sampleHlpTokenMethods
      );
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.allowanceTarget).to.eq(HlpConfig.HLP_CONTRACTS.arbitrum?.HPSM);
    });
  });
});
