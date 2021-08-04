import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { Vault } from "../../src/types/Vault";
import { fxTokens } from "../../src/types/ProtocolTokens";
import { ethers } from "ethers";
import { getSDK } from "../setupTests";

let sdk: SDK;
let vault: Vault;

const BURN_AMOUNT = ethers.utils.parseEther("0.0000000000000001");
const GAS_LIMIT = ethers.BigNumber.from("2500000");

describe("Vault: burn", function () {
  beforeAll(async () => {
    sdk = getSDK();
    const account = await sdk.signer?.getAddress()!;
    vault = await Vault.from(account, fxTokens.fxAUD, sdk);
  });
  it("Should burn", async () => {
    if (vault.debt.lt(BURN_AMOUNT)) {
      await (
        await vault.mintWithEth(BURN_AMOUNT, ethers.utils.parseEther("0.000027"), false, GAS_LIMIT)
      ).wait(1);
    }

    await (await vault.burn(BURN_AMOUNT, false, GAS_LIMIT)).wait(1);
  });
});
