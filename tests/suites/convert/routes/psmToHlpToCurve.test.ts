import { ethers } from "hardhat";
import { expect } from "chai";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { eurs } from "../test-tokens";
import { config, ConvertSDK, TokenInfo } from "../../../../src";
import { testTokenList } from "../../../mock-data/token-list";

const signer = ethers.provider.getSigner(0);

let usdc: TokenInfo;
let usdt: TokenInfo;

describe("psmToHlpToCurve", () => {
  before(() => {
    usdt = testTokenList.getTokenBySymbol("USDT", "arbitrum")!;
    usdc = testTokenList.getTokenBySymbol("USDC", "arbitrum")!;
  });
  describe("quote", () => {
    it("should get a quote from a pegged token to a curve token", async () => {
      // usdt and usdc has 6 decimals
      const sellAmount = ethers.utils.parseUnits("5", 6);
      const quote = await ConvertSDK.getQuote({
        fromToken: usdt,
        toToken: usdc,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount,
        gasPrice: ethers.constants.One,
        signerOrProvider: signer,
        hlpMethods: sampleHlpTokenMethods
      });
      // won't overflow as units are 1e6
      const expectedBuyAmount = +sellAmount; // both tokens have the same decimals, and are usd stablecoins
      const tolerance = 0.02; // stablecoin swap won't have more than 2% variance

      const isBuyAmountWithinTolerance =
        +quote.buyAmount <= expectedBuyAmount * (1 + tolerance) &&
        +quote.buyAmount >= expectedBuyAmount * (1 - tolerance);

      expect(quote.allowanceTarget).to.eq(config.protocol.arbitrum.protocol.routerHpsmHlpCurve);
      expect(quote.sellAmount.toString()).to.eq(sellAmount.toString());
      expect(isBuyAmountWithinTolerance).to.be.true;
    });
    it("should get a quote from a pegged token to a different currency curve token", async () => {
      // usdt and usdc has 6 decimals
      const sellAmount = ethers.utils.parseUnits("5", 6);
      const quote = await ConvertSDK.getQuote({
        fromToken: usdt,
        toToken: eurs,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount,
        gasPrice: ethers.constants.One,
        signerOrProvider: signer,
        hlpMethods: sampleHlpTokenMethods
      });

      expect(quote.allowanceTarget).to.eq(config.protocol.arbitrum.protocol.routerHpsmHlpCurve);
      expect(quote.sellAmount.toString()).to.eq(sellAmount.toString());
      expect(quote).to.have.property("buyAmount");
      expect(typeof quote.buyAmount).to.eq("string");
    });
  });
  describe("swap", () => {
    it("should get a transaction from a pegged token to a curve token", async () => {
      // usdt has 6 decimals
      const sellAmount = ethers.utils.parseUnits("5", 6);
      // sample hlp methods havea 1:1 ratio of token prices
      const expectedBuyAmount = ethers.utils.parseUnits("5", 18);
      const tx = await ConvertSDK.getSwap({
        fromToken: usdt,
        toToken: usdc,
        sellAmount,
        gasPrice: ethers.constants.One,
        signer,
        hlpMethods: sampleHlpTokenMethods,
        buyAmount: expectedBuyAmount,
        slippage: 0.5
      });
      expect(tx.to).to.eq(config.protocol.arbitrum.protocol.routerHpsmHlpCurve);
      await ethers.provider.estimateGas(tx); // if this throws, the test fails
    });
    it("should get a transaction from a pegged token to a different currency curve token", async () => {
      // usdt has 6 decimals
      const sellAmount = ethers.utils.parseUnits("5", 6);
      // sample hlp methods havea 1:1 ratio of token prices
      const expectedBuyAmount = ethers.utils.parseUnits("5", 18);
      const tx = await ConvertSDK.getSwap({
        fromToken: usdt,
        toToken: eurs,
        sellAmount,
        gasPrice: ethers.constants.One,
        signer,
        hlpMethods: sampleHlpTokenMethods,
        buyAmount: expectedBuyAmount,
        slippage: 0.5
      });
      expect(tx.to).to.eq(config.protocol.arbitrum.protocol.routerHpsmHlpCurve);
    });
  });
});
