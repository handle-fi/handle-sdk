import { TokenInfo } from "@uniswap/token-lists";
import { expect } from "chai";
import { ethers } from "hardhat";
import Convert from "../../../../src/components/Convert";
import { testTokenList } from "../../../mock-data/token-config";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { eth } from "../test-tokens";

let usdc: TokenInfo;
let wbtc: TokenInfo;

describe("oneInch route", () => {
  before(() => {
    usdc = testTokenList.getTokenBySymbol("USDC", "arbitrum")!;
    wbtc = testTokenList.getTokenBySymbol("WBTC", "arbitrum")!;
  });
  describe("quote", () => {
    it(`should return an api quote for arbitrum`, async () => {
      const quote = await Convert.getQuote({
        fromToken: usdc,
        toToken: wbtc,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount: ethers.utils.parseEther("1"),
        gasPrice: ethers.constants.One,
        hlpMethods: sampleHlpTokenMethods
      });
      expect(quote).to.have.property("buyAmount");
      expect(quote).to.have.property("sellAmount");
      expect(quote.feeChargedBeforeConvert).to.be.true;
    });
  });
  describe("swap", () => {
    it(`should return an api swap for arbitrum`, async () => {
      const signer = new ethers.VoidSigner(
        "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        ethers.provider
      );
      const tx = await Convert.getSwap({
        fromToken: eth,
        toToken: wbtc,
        gasPrice: ethers.utils.parseUnits("100", "gwei"), // very high gas price
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        buyAmount: ethers.utils.parseUnits("1", wbtc.decimals),
        signer,
        slippage: 0.5
      });
      expect(tx).to.be.an("object");
    });
  });
});
