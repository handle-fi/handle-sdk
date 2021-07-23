import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { Vault } from "../../src/types/Vault";
import { fxTokens } from "../../src/types/ProtocolTokens";
import { ethers } from "ethers";
import { getSDK } from "../setupTests";
import { fxKeeperPool } from "../../src";

let sdk: SDK;
let vault: Vault;
let keeperPool: fxKeeperPool;

describe("Vault: mintWithEth, fxKeeperPool", function () {
  beforeAll(() => {
    sdk = getSDK();
  });
  it("Should load vault", async () => {
    // @ts-ignore
    const account = await sdk.signer.getAddress();
    vault = await Vault.from(account, fxTokens.fxAUD, sdk);
    keeperPool = sdk.keeperPools[fxTokens.fxAUD];
    expect(keeperPool).not.toBeNull();
  });
  it("Should mint with ether as collateral", async () => {
    await (
      await vault.mintWithEth(
        ethers.utils.parseEther("0.000001"), // .00001 cent of fxAUD
        ethers.utils.parseEther("0.00000027"), // approximately  0.001 AUD in Ether
        false
      )
    ).wait(1);
    expect(vault.debt.gt(0)).toBeTruthy();
  });
  it("Should allow to stake fxTokens in keeper pool", async () => {
    await (await keeperPool.stake(ethers.BigNumber.from("10"))).wait(1); // 10 wei.
  });
  it("Should return balanceOfStake from keeper pool instance", async () => {
    const balanceOfStake = await keeperPool.balanceOfStake(vault.account);
    expect(balanceOfStake.gt(0)).toBeTruthy();
  });
  it("Should allow to unstake fxTokens from keeper pool", async () => {
    await (await keeperPool.unstake(ethers.BigNumber.from("10"))).wait(1); // 10 wei.
  });
});
