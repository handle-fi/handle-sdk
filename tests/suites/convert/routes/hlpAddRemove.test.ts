import { ethers } from "hardhat";
import { expect } from "chai";
import Convert from "../../../../src/components/Convert";
import { FIVE_DOLLARS, ONE_DOLLAR, sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { eth, fxUsd, hlp } from "../test-tokens";
import { testTokenList } from "../../../mock-data/token-list";

const signer = ethers.provider.getSigner(0);

describe("hLPAddRemove", () => {
  describe("quote", () => {
    it("should correctly calculate from hlp to a token", async () => {
      const hlpTokenMethods = {
        ...sampleHlpTokenMethods,
        getHlpPrice: () => FIVE_DOLLARS,
        getMinPrice: () => ONE_DOLLAR,
        getMaxPrice: () => ONE_DOLLAR,
        getAveragePrice: () => ONE_DOLLAR
      };
      const quote = await Convert.getQuote({
        fromToken: hlp,
        toToken: fxUsd,
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseEther("1"),
        gasPrice: ethers.constants.One,
        hlpMethods: hlpTokenMethods,
        tokenList: testTokenList.getLoadedTokens()
      });
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
      const quote = await Convert.getQuote({
        fromToken: hlp,
        toToken: eth,
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseEther("1"),
        gasPrice: ethers.constants.One,
        hlpMethods: hlpTokenMethods,
        tokenList: testTokenList.getLoadedTokens()
      });
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
      const quote = await Convert.getQuote({
        toToken: hlp,
        fromToken: fxUsd,
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseEther("5"),
        gasPrice: ethers.constants.One,
        hlpMethods: hlpTokenMethods,
        tokenList: testTokenList.getLoadedTokens()
      });
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
      const quote = await Convert.getQuote({
        toToken: hlp,
        fromToken: eth,
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseEther("5"),
        gasPrice: ethers.constants.One,
        hlpMethods: hlpTokenMethods,
        tokenList: testTokenList.getLoadedTokens()
      });
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("1").toString());
    });
  });
  describe("swap", () => {
    it("should return a transaction from hlp to a token", async () => {
      const tx = await Convert.getSwap({
        fromToken: hlp,
        toToken: fxUsd,
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", hlp.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signer,
        slippage: 0.05,
        tokenList: testTokenList.getLoadedTokens()
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from hlp to eth ", async () => {
      const tx = await Convert.getSwap({
        fromToken: hlp,
        toToken: eth,
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", hlp.decimals),
        // price of eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", eth.decimals),
        signer: signer,
        slippage: 0.05,
        tokenList: testTokenList.getLoadedTokens()
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from a token to hlp", async () => {
      const tx = await Convert.getSwap({
        fromToken: fxUsd,
        toToken: hlp,
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        buyAmount: ethers.utils.parseUnits("1", hlp.decimals),
        signer: signer,
        slippage: 0.05,
        tokenList: testTokenList.getLoadedTokens()
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from eth to hlp", async () => {
      const tx = await Convert.getSwap({
        fromToken: eth,
        toToken: hlp,
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        // price of eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", fxUsd.decimals),
        signer: signer,
        slippage: 0.05,
        tokenList: testTokenList.getLoadedTokens()
      });
      expect(tx).to.be.an("object");
    });
  });
});
