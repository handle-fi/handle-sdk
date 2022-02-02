import packageJson from "../../package.json";
import { ethers } from "ethers";
import { Protocol } from "./Protocol";
import {Abi, Config, NetworkConfig, ValidNetworkConfig} from "./Config";
import { CollateralTokens, fxTokens, fxTokensArray } from "./ProtocolTokens";
import { Vault } from "./Vault";
import { GraphQLClient } from "graphql-request/dist";
import { fxKeeperPool } from "./fxKeeperPool";
import { readTokenRegistry } from "../readers/tokenRegistry";

export enum Events {
  Load = "load",
  Connect = "connect"
}

const providerError = "Could not fetch provider object from signer/provider object";

/** Handle SDK object */
export class SDK {
  private eventListeners: { [key: string]: Function[] } = {};
  public version: string;
  public network!: string;
  public provider: ethers.providers.Provider;
  /** Optional Signer for writing to contracts */
  public signer?: ethers.Signer;
  public protocol!: Protocol;
  public vaults: Vault[];
  public contracts!: {
    handle: ethers.Contract;
    comptroller: ethers.Contract;
    treasury: ethers.Contract;
    fxKeeperPool: ethers.Contract;
    fxTransformer: ethers.Contract;
    vaultLibrary: ethers.Contract;
    liquidator: ethers.Contract;
    rewardPool: ethers.Contract;
    governanceLock: ethers.Contract;
    forex: ethers.Contract;
    [fxTokens.fxAUD]: ethers.Contract;
    [fxTokens.fxPHP]: ethers.Contract;
    [fxTokens.fxEUR]: ethers.Contract;
    [fxTokens.fxKRW]: ethers.Contract;
    [fxTokens.fxCNY]: ethers.Contract;
    [fxTokens.fxUSD]: ethers.Contract;
    [CollateralTokens.WETH]: ethers.Contract;
    [CollateralTokens.WBTC]: ethers.Contract;
    [CollateralTokens.DAI]: ethers.Contract;
    [CollateralTokens.FOREX]: ethers.Contract;
  };
  public keeperPools: { [fxTokenSymbol: string]: fxKeeperPool };
  public gqlClient: GraphQLClient;

  private constructor(providerOrSigner: ethers.providers.Provider | ethers.Signer, gqlUrl: string) {
    if (ethers.Signer.isSigner(providerOrSigner)) {
      this.signer = providerOrSigner;
      if (!this.signer.provider) throw new Error("Signer must have provider");
      this.provider = this.signer.provider;
    } else {
      this.provider = providerOrSigner;
    }
    this.version = packageJson.version;
    this.vaults = [];
    this.keeperPools = {};
    this.gqlClient = new GraphQLClient(gqlUrl);
  }

  /** Loads a new SDK from a provider or signer and optional alternative handle contract address */
  public static async from(
    signerOrProvider: ethers.providers.Provider | ethers.Signer,
    handle?: string,
    subgraphEndpoint?: string
  ): Promise<SDK> {
    // Validate provider/signer object.
    const isSigner = ethers.Signer.isSigner(signerOrProvider);
    const provider: ethers.providers.Provider | undefined = isSigner
      ? (signerOrProvider as ethers.Signer).provider
      : (signerOrProvider as ethers.providers.Provider);
    if (!ethers.providers.Provider.isProvider(provider)) throw new Error(providerError);
    // Validate that network is supported.
    const networkConfig = SDK.getValidatedNetworkConfig(
      await provider.getNetwork(),
      handle,
      subgraphEndpoint
    );
    const sdk = new SDK(signerOrProvider, networkConfig.theGraphEndpoint);
    sdk.network = (await sdk.provider.getNetwork()).name;
    await sdk.loadContracts(networkConfig);
    sdk.initialiseKeeperPools();
    sdk.protocol = await Protocol.from(sdk);
    sdk.trigger(Events.Load, signerOrProvider);
    return sdk;
  }

  /** Connects a new signer/provider to this SDK instance */
  public connect(signerOrProvider: ethers.Signer | ethers.providers.Provider): SDK {
    const isSigner = ethers.Signer.isSigner(signerOrProvider);
    if (isSigner) {
      this.signer = signerOrProvider as ethers.Signer;
      if (!ethers.providers.Provider.isProvider(this.signer.provider))
        throw new Error(providerError);
      this.provider = this.signer.provider;
    } else {
      this.signer = undefined;
      this.provider = signerOrProvider as ethers.providers.Provider;
    }
    // Re-connect all contracts.
    Object.keys(this.contracts).forEach((key) =>
      // @ts-ignore
      (this.contracts[key] as ethers.Contract).connect(signerOrProvider)
    );
    // Re-connect all keeper pools.
    Object.keys(this.keeperPools).forEach((key) =>
      this.keeperPools[key].contract.connect(signerOrProvider)
    );
    // Trigger connection event.
    this.trigger(Events.Connect, signerOrProvider);
    return this;
  }

  /**
   * Ensures all the correct parameters are passed to the SDK via the NetworkConfig object before initialisation.
   * @param network The network object.
   * @param handle The handle contract address.
   * @param subgraphEndpoint The subgraph endpoint URL.
   */
  private static getValidatedNetworkConfig(
    network: ethers.providers.Network,
    handle?: string,
    subgraphEndpoint?: string
  ): ValidNetworkConfig {
    const defaultConfig = Config.getNetworkConfig(network);
    const handleAddress = handle ?? defaultConfig.handleAddress;
    if (handleAddress == null)
      throw new Error(
        "Could not load handle contract address from default config object." +
          " Please pass this (otherwise optional) parameter when creating the SDK object."
      );
    const theGraphEndpoint = subgraphEndpoint ?? defaultConfig.theGraphEndpoint;
    if (theGraphEndpoint == null)
      throw new Error(
        "Could not load subgraph endpoint URL from default config object." +
          " Please pass this (otherwise optional) parameter when creating the SDK object."
      );
    return {
      ...defaultConfig,
      handleAddress
    } as ValidNetworkConfig;
  }

  private async loadContracts(config: NetworkConfig) {
    if (!config.handleAddress)
      throw new Error("Config passed to loadContracts does not contain " +
        "handle contract");
    // @ts-ignore
    this.contracts = {};
    /** Type for local config of contracts to load */
    type ContractObj = { name: string; abi: Abi; addressGetter: () => string };
    const contractsToLoad: ContractObj[] = [
      {
        name: "handle",
        abi: Abi.Handle,
        // @ts-ignore
        addressGetter: async () => config.handleAddress
      },
      {
        name: "comptroller",
        abi: Abi.Comptroller,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.comptroller()
      },
      {
        name: "treasury",
        abi: Abi.Treasury,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.treasury()
      },
      {
        name: "vaultLibrary",
        abi: Abi.VaultLibrary,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.vaultLibrary()
      },
      {
        name: "fxKeeperPool",
        abi: Abi.fxKeeperPool,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.fxKeeperPool()
      },
      {
        name: "liquidator",
        abi: Abi.Liquidator,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.liquidator()
      },
      {
        name: "rewardPool",
        abi: Abi.RewardPool,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.rewards() 
      },
      {
        name: "forex",
        abi: Abi.ERC20,
        // @ts-ignore
        addressGetter: async () => await this.contracts.handle.forex() 
      },
      {
        name: "governanceLock",
        abi: Abi.GovernanceLock,
        // @ts-ignore
        addressGetter: async () => config.governanceLockAddress 
      },
      {
        name: "fxTransformer",
        abi: Abi.fxTransformer,
        // @ts-ignore
        addressGetter: async () => config.fxTransformerAddress 
      }
    ];
    const setContract = async (obj: ContractObj) => {
      // @ts-ignore
      this.contracts[obj.name] = new ethers.Contract(
        await obj.addressGetter(),
        await Config.getAbi(obj.abi),
        this.signer ?? this.provider
      );
    };
    // Load handle contract.
    await setContract(contractsToLoad[0]);
    // Build concurrent promises after having loaded Handle dependency contract.
    // This is only used here because of the address getters.
    const promises = [];
    for (let i = 1; i < contractsToLoad.length; i++) {
      promises.push(setContract(contractsToLoad[i]));
    }
    // Load ERC20s for fxTokens and collateral tokens.
    const { fxTokens, collateralTokens } = await readTokenRegistry(
      this.gqlClient,
      config.handleAddress
    );
    if (!(fxTokens?.length > 0)) throw new Error("Could not fetch fxTokens from Handle subgraph");
    const erc20s = [...fxTokens, ...collateralTokens];
    for (let erc20 of erc20s) {
      const contract = new ethers.Contract(
        erc20,
        await Config.getAbi(Abi.ERC20),
        this.signer ?? this.provider
      );
      const symbol = await contract.symbol();
      // IMPORTANT NOTE: If the ERC20 symbol does not match the enum property name, this will fail.
      // @ts-ignore
      this.contracts[symbol] = contract;
    }
    await Promise.all(promises);
  }

  public async loadVaults() {
    // Can't load vaults without signer.
    if (!this.signer) return;
    const account = await this.signer.getAddress();

    const usersActiveVaults = await Vault.getUsersVaults(account, this);
    const usersInactiveVaults = fxTokensArray
      .filter(
        (fxToken) =>
          !usersActiveVaults.find((v) => v.token.symbol === fxToken) &&
          this.contracts[fxToken as fxTokens] != null
      )
      .map((fxToken) => new Vault(account, fxToken as fxTokens, this));

    this.vaults = [...usersActiveVaults, ...usersInactiveVaults];
  }

  private initialiseKeeperPools() {
    for (let fxTokenSymbol of fxTokensArray) {
      const token = fxTokenSymbol as fxTokens;
      if (this.contracts[token] == null) continue;
      this.keeperPools[token] = new fxKeeperPool(this, token, this.contracts.fxKeeperPool);
    }
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
  }

  private trigger(event: string, ...data: any[]): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((callback) => callback(...data));
  }
}
