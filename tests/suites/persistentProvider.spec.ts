import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { ethers } from "ethers";
import { fxTokens } from "../../src/types/ProtocolTokens";

let sdk: SDK;
let signer: ethers.Signer;
let provider: ethers.providers.Provider;

const secondaryPrivateKey = "0000000000000000000000000000000000000000000000000000000000001234";

describe("SDK: persistentProvider", function () {
  beforeAll(async () => {
    // Create provider.
    provider = new ethers.providers.InfuraWebSocketProvider(
      process.env.NETWORK,
      process.env.INFURA_KEY
    );
  });
  it("Should load SDK from provider", async () => {
    sdk = await SDK.from(provider);
  });
  it("Should have loaded SDK provider", async () => {
    const networkExpected = process.env.NETWORK;
    const network = await sdk.provider.getNetwork();
    if (!network) throw "invalid network";
    expect(network.name).toEqual(networkExpected);
  });
  it("Should connect signer to SDK loaded with provider", async () => {
    signer = new ethers.Wallet(
      // @ts-ignore
      process.env.PRIVATE_KEY
    ).connect(provider);
    sdk.connect(signer);
  });
  it("Should have loaded vaults signer", async () => {
    await sdk.loadVaults();
    expect(sdk.vaults.length > 0).toBeTruthy();
    const vaultFxAUD = sdk.vaults.find((x) => x.token.symbol === fxTokens.fxAUD);
    expect(vaultFxAUD).not.toBeNull();
    if (!vaultFxAUD) throw "vaultFxAUD is undefined";
    expect(vaultFxAUD.account).toBe((await signer.getAddress()).toLowerCase());
  });
  it("Should connect signer to SDK loaded with an existing signer", async () => {
    if (typeof process.env.PRIVATE_KEY !== "string") throw "private key not defined";
    signer = new ethers.Wallet(secondaryPrivateKey).connect(provider);
    sdk.connect(signer);
  });
  it("Should have loaded new vaults signer", async () => {
    const address = await signer.getAddress();
    await sdk.loadVaults();
    expect(sdk.vaults.length > 0).toBeTruthy();
    const vaultFxAUD = sdk.vaults.find((x) => x.token.symbol === fxTokens.fxAUD);
    expect(vaultFxAUD).not.toBeNull();
    if (!vaultFxAUD) throw "vaultFxAUD is undefined";
    expect(vaultFxAUD.account).toBe(address);
  });
  afterAll(() => {
    // @ts-ignore
    signer.provider._websocket.terminate();
    // @ts-ignore
    signer = null;
  });
});
