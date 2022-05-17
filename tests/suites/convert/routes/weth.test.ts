import { ethers } from "hardhat";
import { expect } from "chai";
import Convert from "../../../../src/components/Convert";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { eth, weth } from "../test-tokens";
import { tokenList } from "../../../mock-data/token-list";

const signer = ethers.provider.getSigner(0);

describe("weth route", () => {
  describe("quote", () => {
    it("should be 1-1 from eth to weth", async () => {
      const quote = await Convert.getQuote({
        fromToken: weth,
        toToken: eth,
        network: "arbitrum",
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.constants.One,
        gasPrice: ethers.constants.One,
        hlpMethods: sampleHlpTokenMethods,
        tokenList: tokenList.getLoadedTokens()
      });
      expect(quote.sellAmount).to.eq(quote.buyAmount);
      expect(quote.feeBasisPoints).to.eq(0);
      expect(quote.allowanceTarget).to.eq(null);
    });
    it("should be 1-1 from weth to eth", async () => {
      const quote = await Convert.getQuote({
        fromToken: weth,
        toToken: eth,
        network: "arbitrum",
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.constants.One,
        gasPrice: ethers.constants.One,
        hlpMethods: sampleHlpTokenMethods,
        tokenList: tokenList.getLoadedTokens()
      });
      expect(quote.sellAmount).to.eq(quote.buyAmount);
      expect(quote.feeBasisPoints).to.eq(0);
      expect(quote.allowanceTarget).to.eq(null);
    });
  });
  describe("swap", () => {
    describe("WETH", () => {
      it("should return a transaction from eth to weth", async () => {
        const tx = await Convert.getSwap({
          fromToken: eth,
          toToken: weth,
          network: "arbitrum",
          connectedAccount: await signer.getAddress(),
          gasPrice: ethers.constants.One,
          hlpMethods: sampleHlpTokenMethods,
          buyAmount: ethers.utils.parseEther("0.01"),
          sellAmount: ethers.utils.parseEther("0.01"),
          signer: signer,
          slippage: 0.05,
          tokenList: tokenList.getLoadedTokens()
        });
        expect(tx).to.be.an("object");
      });
      it("should return a transaction from weth to eth", async () => {
        const tx = await Convert.getSwap({
          fromToken: weth,
          toToken: eth,
          network: "arbitrum",
          connectedAccount: await signer.getAddress(),
          gasPrice: ethers.utils.parseUnits("1", "gwei"),
          hlpMethods: sampleHlpTokenMethods,
          buyAmount: ethers.utils.parseEther("0.01"),
          sellAmount: ethers.utils.parseEther("0.01"),
          signer: signer,
          slippage: 0.05,
          tokenList: tokenList.getLoadedTokens()
        });
        expect(tx).to.be.an("object");
      });
    });
  });
});
