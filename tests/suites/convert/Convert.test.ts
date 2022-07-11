import { expect } from "chai";
import { ethers } from "hardhat";
import Convert from "../../../src/components/Convert";
import { sampleHlpTokenMethods } from "./sampleHlpTokenMethods";
import { fxAud, fxUsd } from "./test-tokens";

const signer = ethers.provider.getSigner(0);

describe("Convert class", () => {
  describe("quote", () => {
    it("Should throw if signer is on different network than tokens", async () => {
      try {
        await Convert.getQuote({
          fromToken: { ...fxAud, chainId: 1 },
          toToken: { ...fxUsd, chainId: 1 },
          receivingAccount: await signer.getAddress(),
          gasPrice: ethers.utils.parseUnits("1", "gwei"),
          sellAmount: ethers.utils.parseUnits("1", fxAud.decimals),
          hlpMethods: sampleHlpTokenMethods,
          signerOrProvider: signer
        });
        fail("Should throw");
      } catch (e: any) {
        expect(e.message).to.eq("Signer/Provider is on a different network than the tokens");
      }
    });
    it("Should throw if tokens are on different networks", async () => {
      try {
        await Convert.getQuote({
          fromToken: fxAud,
          toToken: { ...fxUsd, chainId: 1 },
          receivingAccount: await signer.getAddress(),
          gasPrice: ethers.utils.parseUnits("1", "gwei"),
          sellAmount: ethers.utils.parseUnits("1", fxAud.decimals),
          signerOrProvider: signer
        });
        fail("Should throw");
      } catch (e: any) {
        expect(e.message).to.include("different chains");
      }
    });
  });
  describe("swap", () => {
    it("Should throw if signer is on different network than tokens", async () => {
      try {
        await Convert.getSwap({
          fromToken: { ...fxAud, chainId: 1 },
          toToken: { ...fxUsd, chainId: 1 },
          gasPrice: ethers.utils.parseUnits("1", "gwei"),
          sellAmount: ethers.utils.parseUnits("1", fxAud.decimals),
          buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
          signer: signer,
          slippage: 0.05
        });
        fail("Should throw");
      } catch (e: any) {
        expect(e.message).to.eq("Signer/Provider is on a different network than the tokens");
      }
    });
    it("Should throw if tokens are on different networks", async () => {
      try {
        await Convert.getSwap({
          fromToken: { ...fxAud, chainId: 1 },
          toToken: fxUsd,
          gasPrice: ethers.utils.parseUnits("1", "gwei"),
          sellAmount: ethers.utils.parseUnits("1", fxAud.decimals),
          buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
          signer: signer,
          slippage: 0.05
        });
        fail("Should throw");
      } catch (e: any) {
        expect(e.message).to.include("different chains");
      }
    });
  });
});
