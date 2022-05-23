import { ethers } from "hardhat";
import { expect } from "chai";
import Convert from "../../../../src/components/Convert";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { fxUsd } from "../test-tokens";
import { config } from "../../../../src";
import { testTokenList } from "../../../mock-data/token-list";
import { TokenInfo } from "@uniswap/token-lists";

const arbitrumProvider = new ethers.providers.JsonRpcProvider(
  "https://arb-mainnet.g.alchemy.com/v2/HORad5Nv96-kPzIx9oEPU0tCEiIVp-Oz"
);

let usdt: TokenInfo;

const signer = ethers.provider.getSigner(0);

describe("psm", () => {
  before(() => {
    const foundUsdt = testTokenList.getTokenBySymbol("USDT", "arbitrum");
    if (!foundUsdt) {
      throw new Error("USDT not found on arbitrum");
    }
    usdt = foundUsdt;
  });
  describe("quote", () => {
    it("should return a quote to pegged tokens", async () => {
      // fxUSD is assumed to be pegged to USDT
      const quote = await Convert.getQuote({
        toToken: usdt,
        fromToken: fxUsd,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount: ethers.utils.parseEther("5"),
        gasPrice: ethers.constants.One,
        signerOrProvider: arbitrumProvider,
        hlpMethods: sampleHlpTokenMethods
      });
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseUnits("5", usdt.decimals).toString());
      expect(quote.allowanceTarget).to.eq(null); // no allowance needed on withdraw
    });
    it("should return a quote from pegged tokens", async () => {
      // fxUSD is assumed to be pegged to USDT
      const quote = await Convert.getQuote({
        fromToken: usdt,
        toToken: fxUsd,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount: ethers.utils.parseUnits("5", usdt.decimals),
        gasPrice: ethers.constants.One,
        signerOrProvider: arbitrumProvider,
        hlpMethods: sampleHlpTokenMethods
      });
      expect(quote.sellAmount).to.eq(ethers.utils.parseUnits("5", usdt.decimals).toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.allowanceTarget).to.eq(config.protocol.arbitrum?.protocol.hPsm);
    });
  });
  describe("swap", () => {
    it("should return a swap to pegged tokens", async () => {
      const tx = await Convert.getSwap({
        fromToken: usdt,
        toToken: fxUsd,
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", usdt.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
      expect(tx.to).to.eq(config.protocol.arbitrum?.protocol.hPsm);
    });
    it("should return a swap from pegged tokens", async () => {
      const usdt = testTokenList.getTokenBySymbol("USDT", "arbitrum");
      if (!usdt) {
        throw new Error("USDT not found on arbitrum");
      }
      const tx = await Convert.getSwap({
        toToken: usdt,
        fromToken: fxUsd,
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", usdt.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
      expect(tx.to).to.eq(config.protocol.arbitrum?.protocol.hPsm);
    });
  });
});
