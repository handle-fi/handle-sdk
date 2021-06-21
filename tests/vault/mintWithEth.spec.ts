import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { Vault } from "../../src/types/Vault";
import { fxTokens } from "../../src/types/ProtocolTokens";
import { ethers } from "ethers";
import { getSDK } from "../setupTests";

let sdk: SDK;
let vault: Vault;

describe("Vault: mintWithEth", function () {
  beforeAll(() => {
    sdk = getSDK();
  });
  it("Should load vault", async () => {
    // @ts-ignore
    const account = await sdk.signer.getAddress();
    vault = await Vault.from(account, fxTokens.fxAUD, sdk);
  });
  it("Should mint with ether as collateral", async () => {
    await vault.mintWithEth(
      ethers.utils.parseEther("0.000001"), // .00001 cent of fxAUD
      ethers.utils.parseEther("0.00000027"), // approximately  0.001 AUD in Ether
      false
    );
    expect(vault.debt.gt(0)).toBeTruthy();
  });
});
