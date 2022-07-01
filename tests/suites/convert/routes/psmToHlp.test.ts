import { ethers } from "hardhat";
import { expect } from "chai";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { fxAud } from "../test-tokens";
import { config, ConvertSDK } from "../../../../src";
import { testTokenList } from "../../../mock-data/token-list";
import { TokenInfo } from "@uniswap/token-lists";

const arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_URL);

let usdt: TokenInfo;

// const signer = ethers.provider.getSigner(0);

describe("psmToHlp", () => {
  before(() => {
    const foundUsdt = testTokenList.getTokenBySymbol("USDT", "arbitrum");
    if (!foundUsdt) {
      throw new Error("USDT not found on arbitrum");
    }
    usdt = foundUsdt;
  });
  describe("quote", () => {
    it("should get a quote from a pegged token to a hlp token", async () => {
      // usdt has 6 decimals
      const sellAmount = ethers.utils.parseUnits("5", 6);
      // sample hlp methods havea 1:1 ratio of token prices
      const expectedBuyAmount = ethers.utils.parseUnits("5", 18);
      const quote = await ConvertSDK.getQuote({
        fromToken: usdt,
        toToken: fxAud,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount,
        gasPrice: ethers.constants.One,
        signerOrProvider: arbitrumProvider,
        hlpMethods: sampleHlpTokenMethods
      });
      console.log(quote);
      expect(quote.allowanceTarget).to.eq(config.protocol.arbitrum.protocol.routerHpsmHlp);
      expect(quote.sellAmount.toString()).to.eq(sellAmount.toString());
      expect(quote.buyAmount.toString()).to.eq(expectedBuyAmount.toString());
    });
  });
  describe("swap", () => {});
});
