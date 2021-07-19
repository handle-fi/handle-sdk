import packageJson from "../../package.json";
import { ethers } from "ethers";
import { Protocol } from "./Protocol";
import { Abi, Config } from "./Config";
import { CollateralTokens, fxTokens, fxTokensArray } from "./ProtocolTokens";
import { Vault } from "./Vault";
import { GraphQLClient } from "graphql-request/dist";
import { fxKeeperPool } from "./fxKeeperPool";

/** Handle SDK object */
export class SDK {
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
    vaultLibrary: ethers.Contract;
    [fxTokens.fxAUD]: ethers.Contract;
    [fxTokens.fxEUR]: ethers.Contract;
    [fxTokens.fxKRW]: ethers.Contract;
    [fxTokens.fxCNY]: ethers.Contract;
    [CollateralTokens.WETH]: ethers.Contract;
    [CollateralTokens.WBTC]: ethers.Contract;
    [CollateralTokens.DAI]: ethers.Contract;
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
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    handle?: string,
    subgraphEndpoint?: string
  ): Promise<SDK> {
    let network: string;
    // Validate provider/signer object.
    const provider: ethers.providers.Provider | undefined = ethers.Signer.isSigner(providerOrSigner)
      ? providerOrSigner.provider
      : providerOrSigner;
    if (!ethers.providers.Provider.isProvider(provider))
      throw new Error("Could not fetch provider object from signer/provider object");
    network = (await provider.getNetwork()).name;
    // Validate that network is supported.
    const networkConfig = SDK.getValidatedNetworkConfig(network, handle, subgraphEndpoint);
    const sdk = new SDK(providerOrSigner, networkConfig.theGraphEndpoint);
    sdk.network = (await sdk.provider.getNetwork()).name;
    await sdk.loadContracts(networkConfig.handleAddress);
    sdk.initialiseKeeperPools();
    sdk.protocol = await Protocol.from(sdk);
    return sdk;
  }

  /**
   * Ensures all the correct parameters are passed to the SDK via the NetworkConfig object before initialisation.
   * @param network The network name.
   * @param handle The handle contract address.
   * @param subgraphEndpoint The subgraph endpoint URL.
   */
  private static getValidatedNetworkConfig(
    network: string,
    handle?: string,
    subgraphEndpoint?: string
  ) {
    const defaultConfig = Config.getNetworkConfigByName(network);
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
      networkName: network,
      handleAddress,
      theGraphEndpoint
    };
  }

  private async loadContracts(handle: string) {
    // @ts-ignore
    this.contracts = {};
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
    const [fxTokens, collateralTokens] = await Promise.all([
      this.contracts.handle.getAllFxTokens(),
      this.contracts.handle.getAllCollateralTypes()
    ]);
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
    const fxTokens = this.protocol.fxTokens;
    const promises = [];
    this.vaults = [];
    for (let fxToken of fxTokens) {
      promises.push(
        new Promise(async (resolve) => {
          this.vaults.push(await Vault.from(account, fxToken.symbol as fxTokens, this));
          resolve(undefined);
        })
      );
    }
    await Promise.all(promises);
  }

  private initialiseKeeperPools() {
    for (let fxTokenSymbol of fxTokensArray) {
      const token = fxTokenSymbol as fxTokens;
      this.keeperPools[token] = new fxKeeperPool(this, token, this.contracts.fxKeeperPool);
    }
  }
}
