import { ethers } from "hardhat";
import { expect } from "chai";
import Convert from "../../../../src/components/Convert";
import { PRICE_DECIMALS } from "../../../../src/config/hlp";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { eth, fxAud, fxUsd } from "../test-tokens";

const signer = ethers.provider.getSigner(0);

describe("hlpSwap", () => {
  describe("quote", () => {
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
      const quote = await Convert.getQuote({
        toToken: fxAud,
        fromToken: fxUsd,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount: ethers.utils.parseEther("5"),
        gasPrice: ethers.constants.One,
        hlpMethods: hlpTokenMethods
      });
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
      const quote = await Convert.getQuote({
        toToken: fxAud,
        fromToken: eth,
        receivingAccount: ethers.constants.AddressZero,
        sellAmount: ethers.utils.parseEther("5"),
        gasPrice: ethers.constants.One,
        hlpMethods: hlpTokenMethods
      });
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("10").toString());
    });
  });
  describe("swap", () => {
    it("should return a swap for two tokens", async () => {
      const tx = await Convert.getSwap({
        fromToken: fxUsd,
        toToken: fxAud,
        receivingAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        // price of fxUsd / fxAud fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", fxAud.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
    it("should return a swap for a token and eth", async () => {
      const tx = await Convert.getSwap({
        fromToken: fxUsd,
        toToken: eth,
        receivingAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        // price of fxUsd / eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", eth.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
});
