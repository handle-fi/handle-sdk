import { ethers } from "hardhat";
import { expect } from "chai";
import Convert from "../../../../src/components/Convert";
import { getTokenDetails } from "../../../../src/utils/token-utils";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";
import { fxUsd } from "../test-tokens";
import { config } from "../../../../src";

const arbitrumProvider = new ethers.providers.JsonRpcProvider(
  "https://arb-mainnet.g.alchemy.com/v2/HORad5Nv96-kPzIx9oEPU0tCEiIVp-Oz"
);

const signer = ethers.provider.getSigner(0);

describe("psm", () => {
  describe("quote", () => {
    it("should return a quote to pegged tokens", async () => {
      // fxUSD is assumed to be pegged to USDT
      const usdt = getTokenDetails("USDT", "arbitrum");
      const quote = await Convert.getQuote({
        toToken: { ...usdt, name: "" },
        fromToken: fxUsd,
        network: "arbitrum",
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseEther("5"),
        gasPrice: ethers.constants.One,
        provider: arbitrumProvider,
        hlpMethods: sampleHlpTokenMethods
      });
      expect(quote.sellAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseUnits("5", usdt.decimals).toString());
      expect(quote.allowanceTarget).to.eq(null); // no allowance needed on withdraw
    });
    it("should return a quote from pegged tokens", async () => {
      // fxUSD is assumed to be pegged to USDT
      const usdt = getTokenDetails("USDT", "arbitrum");
      const quote = await Convert.getQuote({
        fromToken: { ...usdt, name: "" },
        toToken: fxUsd,
        network: "arbitrum",
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseUnits("5", usdt.decimals),
        gasPrice: ethers.constants.One,
        provider: arbitrumProvider,
        hlpMethods: sampleHlpTokenMethods
      });
      expect(quote.sellAmount).to.eq(ethers.utils.parseUnits("5", usdt.decimals).toString());
      expect(quote.buyAmount).to.eq(ethers.utils.parseEther("5").toString());
      expect(quote.allowanceTarget).to.eq(config.protocol.arbitrum?.protocol.hPsm);
    });
    it("should return a quote for unsupported networks even if conditions are met", async () => {
      const usdt = getTokenDetails("USDT", "ethereum");
      const usdc = getTokenDetails("USDC", "ethereum");
      const quote = await Convert.getQuote({
        fromToken: { ...usdt, name: "" },
        toToken: { ...usdc, name: "" },
        network: "ethereum",
        connectedAccount: ethers.constants.AddressZero,
        fromAmount: ethers.utils.parseUnits("5", usdt.decimals),
        gasPrice: ethers.constants.One,
        provider: arbitrumProvider,
        hlpMethods: sampleHlpTokenMethods
      });
      expect(quote).to.be.an("object");
    });
  });
  describe("swap", () => {
    it("should return a swap to pegged tokens", async () => {
      const usdt = getTokenDetails("USDT", "arbitrum");
      const tx = await Convert.getSwap({
        fromToken: { ...usdt, name: "Tether USD" },
        toToken: fxUsd,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
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
      const usdt = getTokenDetails("USDT", "arbitrum");
      const tx = await Convert.getSwap({
        toToken: { ...usdt, name: "Tether USD" },
        fromToken: fxUsd,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
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
    it("should return a swap for unsupported networks even if conditions are met", async () => {
      const usdt = getTokenDetails("USDT", "ethereum");
      const eth = getTokenDetails("ETH", "ethereum");
      const tx = await Convert.getSwap({
        toToken: { ...usdt, name: "Tether USD" },
        fromToken: { ...eth, name: "" },
        network: "ethereum",
        connectedAccount: ethers.constants.AddressZero,
        gasPrice: ethers.utils.parseUnits("100", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        buyAmount: ethers.utils.parseUnits("3000", usdt.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
});
