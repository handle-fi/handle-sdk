﻿import packageJson from "../../package.json";
import { ethers } from "ethers";
import { Protocol } from "./Protocol";
import { Abi, Config } from "./Config";
import { CollateralTokens, fxTokens } from "./ProtocolTokens";

/** Handle SDK object */
export class SDK {
  public version: string;
  public provider: ethers.providers.Provider;
  /** Optional Signer for writing to contracts */
  public signer?: ethers.Signer;
  public protocol!: Protocol;
  public contracts!: {
    handle: ethers.Contract;
    comptroller: ethers.Contract;
    treasury: ethers.Contract;
    fxKeeperPool: ethers.Contract;
    vaultLibrary: ethers.Contract;
    [fxTokens.fxAUD]: ethers.Contract;
    [fxTokens.fxEUR]: ethers.Contract;
    [fxTokens.fxKRW]: ethers.Contract;
    [CollateralTokens.wETH]: ethers.Contract;
    [CollateralTokens.wBTC]: ethers.Contract;
    [CollateralTokens.DAI]: ethers.Contract;
  };

  private constructor(providerOrSigner: ethers.providers.Provider | ethers.Signer) {
    if (ethers.Signer.isSigner(providerOrSigner)) {
      this.signer = providerOrSigner;
      this.provider = this.signer.provider as ethers.providers.Provider;
    } else {
      this.provider = providerOrSigner;
    }
    this.version = packageJson.version;
  }

  /** Loads a new SDK from a provider or signer and optional alternative handle contract address */
  public static async from(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    handle?: string
  ): Promise<SDK> {
    const sdk = new SDK(providerOrSigner);
    const network = (await sdk.provider.getNetwork()).name;
    handle = handle ?? Config.getNetworkHandleAddress(network);
    await SDK.loadContracts(sdk, handle);
    sdk.protocol = await Protocol.from(sdk);
    return sdk;
  }

  /** Sets all contracts for the SDK object */
  private static async loadContracts(sdk: SDK, handle: string) {
    // @ts-ignore
    sdk.contracts = {};
    /** Type for local config of contracts to load */
    type ContractObj = { name: string; abi: Abi; addressGetter: () => string };
    const contractsToLoad: ContractObj[] = [
      {
        name: "handle",
        abi: Abi.Handle,
        // @ts-ignore
        addressGetter: async () => handle
      },
      {
        name: "comptroller",
        abi: Abi.Comptroller,
        // @ts-ignore
        addressGetter: async () => await sdk.contracts.handle.comptroller()
      }
    ];
    const setContract = async (obj: ContractObj) => {
      // @ts-ignore
      sdk.contracts[obj.name] = new ethers.Contract(
        await obj.addressGetter(),
        await Config.getAbi(obj.abi),
        sdk.signer ?? sdk.provider
      );
    };
    // Load handle contract.
    await setContract(contractsToLoad[0]);
    // Build concurrent promises after having loaded Handle dependency contract.
    const promises = [];
    for (let i = 1; i < contractsToLoad.length; i++) {
      promises.push(setContract(contractsToLoad[i]));
    }
    await Promise.all(promises);
  }
}
