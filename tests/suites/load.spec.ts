import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { ethers } from "ethers";
import { CollateralTokens, fxTokens } from "../../src/types/ProtocolTokens";
import { getSDK } from "../setupTests";

let sdk: SDK;

describe("SDK: load/constructor", function () {
  beforeAll(() => {
    sdk = getSDK();
  });
  it("Should have loaded SDK provider and signer", async () => {
    const networkExpected = process.env.NETWORK;
    const network = await sdk.signer?.provider?.getNetwork();
    if (!network) throw "invalid network";
    expect(network.name).toEqual(networkExpected);
  });
  it("Should load all vaults for wallet", async () => {
    await sdk.loadVaults();
    expect(sdk.vaults.length > 0).toBeTruthy();
    expect(sdk.vaults.find((x) => x.token.symbol === fxTokens.fxAUD)).not.toBeNull();
    expect(sdk.vaults.find((x) => x.token.symbol === fxTokens.fxEUR)).not.toBeNull();
    expect(sdk.vaults.find((x) => x.token.symbol === fxTokens.fxKRW)).not.toBeNull();
  });
  it("Should have loaded Handle contract", async () => {
    const address = await sdk.contracts.handle.address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded Comptroller contract", async () => {
    const address = await sdk.contracts.comptroller.address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded Treasury contract", async () => {
    const address = await sdk.contracts.treasury.address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded VaultLibrary contract", async () => {
    const address = await sdk.contracts.vaultLibrary.address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded fxKeeperPool contract", async () => {
    const address = await sdk.contracts.fxKeeperPool.address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded fxAUD contract", async () => {
    const address = await sdk.contracts[fxTokens.fxAUD].address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded fxEUR contract", async () => {
    const address = await sdk.contracts[fxTokens.fxEUR].address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded fxKRW contract", async () => {
    const address = await sdk.contracts[fxTokens.fxKRW].address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded wETH contract", async () => {
    const address = await sdk.contracts[CollateralTokens.WETH].address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded wBTC contract", async () => {
    const address = await sdk.contracts[CollateralTokens.WBTC].address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
  it("Should have loaded DAI contract", async () => {
    const address = await sdk.contracts[CollateralTokens.DAI].address;
    expect(ethers.utils.isAddress(address)).toBeTruthy();
  });
});
