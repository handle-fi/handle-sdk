import { expect } from "chai";
import { ethers } from "hardhat";
import Convert from "../../../../src/components/Convert";
import { getTokenDetails } from "../../../../src/utils/token-utils";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { eth } from "../test-tokens";

describe("oneInch route", () => {
  describe("quote", () => {
    it(`should return an api quote for arbitrum`, async () => {
      const usdc = getTokenDetails("USDC", "arbitrum");
      const usdt = getTokenDetails("USDT", "arbitrum");
      const quote = await Convert.getQuote({
        fromToken: { ...usdc, name: "" },
        toToken: { ...usdt, name: "" },
        network: "arbitrum",
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseEther("1"),
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
      const usdt = getTokenDetails("USDT", "arbitrum");
      const tx = await Convert.getSwap({
        fromToken: { ...getTokenDetails("ETH", "arbitrum"), name: "Ethereum" },
        toToken: { ...usdt, name: "Tether USD" },
        network: "arbitrum",
        connectedAccount: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        gasPrice: ethers.utils.parseUnits("100", "gwei"), // very high gas price
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        buyAmount: ethers.utils.parseUnits("1", usdt.decimals),
        signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
});
