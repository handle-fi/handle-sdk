import { ethers } from "ethers";
import Graph, { IndexedVault } from "./Graph";
import { Provider as MultiCallProvider } from "ethers-multicall";
import { FxToken, FxTokenSymbol } from "../types/fxTokens";
import { Collateral, CollateralSymbolWithNative } from "../types/collaterals";
import {
  SingleCollateralVault,
  SingleCollateralVaultSymbol,
  Vault,
  VaultData
} from "../types/vaults";
import { ProtocolAddresses, FxTokenAddresses, CollateralAddresses, Config } from "../config";
import {
  createMulticallProtocolContracts,
  createProtocolContracts,
  callMulticallObject,
  callMulticallObjects
} from "../utils/contract-utils";
import { Promisified } from "../types/general";
import { CollateralSymbolMap } from "../types/collaterals";
import sdkConfig from "../config";
import CollateralsSDK from "./Collaterals";
import FxTokensSDK from "./FxTokens";
import { getDeadline } from "../utils/general-utils";
import { createSingleCollateralVault, createVault } from "../utils/vault-utils";
import { getFxTokenByAddress, getFxTokenBySymbol } from "../utils/fxToken-utils";
import { getCollateralByAddress, getCollateralBySymbol } from "../utils/collateral-utils";
import { ProtocolSDK } from "..";
import { ProtocolParameters } from "./Protocol";
import {
  getKashiPoolMulticall,
  kashiMulticallResultToSingleCollateralVaultData
} from "../utils/sushiswap-utils";
import KashiCooker from "../utils/KashiCooker";
import { SingleCollateralVaultNetwork } from "../types/network";

export type VaultsConfig = {
  protocolAddresses: ProtocolAddresses;
  fxTokenAddresses: FxTokenAddresses;
  collateralAddresses: CollateralAddresses;
  singleCollateralVaults: Config["singleCollateralVaults"];
  chainId: number;
  graphEndpoint: string;
};

type VaultMulticall = {
  debt: ethers.BigNumber;
};

type vaultCollateralMulticall = Promisified<CollateralSymbolMap<ethers.BigNumber>>;

type MintArguments = {
  fxToken: FxTokenSymbol;
  amount: ethers.BigNumber;
  collateral?: {
    symbol: CollateralSymbolWithNative;
    amount: ethers.BigNumber;
  };
  deadline?: number;
  referral?: string;
};

type DepositCollateralArguments = {
  account: string;
  fxToken: FxTokenSymbol;
  collateral: CollateralSymbolWithNative;
  amount: ethers.BigNumber;
  referral?: string;
};

type BurnArguments = {
  amount: ethers.BigNumber;
  fxToken: FxTokenSymbol;
  deadline?: number;
};

type WithdrawCollateralArguments = {
  account: string;
  fxToken: FxTokenSymbol;
  collateral: CollateralSymbolWithNative;
  amount: ethers.BigNumber;
};

type SingleCollateralMintAndDepositArguments = {
  network: SingleCollateralVaultNetwork;
  vaultSymbol: SingleCollateralVaultSymbol;
  mintAmount?: ethers.BigNumber;
  depositAmount?: ethers.BigNumber;
  approveKashiSignature?: ethers.Signature;
};

type SingleCollateralBurnAndWithdrawArguments = {
  network: SingleCollateralVaultNetwork;
  vaultSymbol: SingleCollateralVaultSymbol;
  burnAmount?: ethers.BigNumber;
  withdrawAmount?: ethers.BigNumber;
};

type SingleCollateralSupplyFxToken = {
  network: SingleCollateralVaultNetwork;
  vaultSymbol: SingleCollateralVaultSymbol;
  amount: ethers.BigNumber;
  approveKashiSignature?: ethers.Signature;
};

export default class Vaults {
  private config: VaultsConfig;
  private fxTokens: FxToken[] = [];
  private collaterals: Collateral[] = [];
  private protocolParameters!: ProtocolParameters;
  private fxTokensSDK: FxTokensSDK;
  private collateralsSDK: CollateralsSDK;
  private protocolSDK: ProtocolSDK;
  private graph: Graph;

  private initialised = false;

  constructor(c?: VaultsConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocolAddress.arbitrum.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      collateralAddresses: sdkConfig.protocolAddress.arbitrum.collaterals,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.theGraphEndpoints.arbitrum,
      singleCollateralVaults: sdkConfig.singleCollateralVaults
    };

    this.fxTokensSDK = new FxTokensSDK(c);
    this.collateralsSDK = new CollateralsSDK(c);
    this.protocolSDK = new ProtocolSDK(c);
    this.graph = new Graph(this.config.graphEndpoint);
  }

  public initAsync = async (signer: ethers.Signer) => {
    const fxTokensPromise = this.fxTokensSDK.getFxTokens(signer);
    const collateralsPromise = this.collateralsSDK.getCollaterals(signer);
    const protocolParametersPromise = this.protocolSDK.getProtocolParameters(signer);
    const [fxTokens, collaterals, protocolParameters] = await Promise.all([
      fxTokensPromise,
      collateralsPromise,
      protocolParametersPromise
    ]);
    this.fxTokens = fxTokens;
    this.collaterals = collaterals;
    this.protocolParameters = protocolParameters;
    this.initialised = true;
  };

  public initSync = (
    protocolParamters: ProtocolParameters,
    fxTokens: FxToken[],
    collaterals: Collateral[]
  ) => {
    this.protocolParameters = protocolParamters;
    this.fxTokens = fxTokens;
    this.collaterals = collaterals;
    this.initialised = true;
  };

  public getVaults = async (account: string, signer: ethers.Signer): Promise<Vault[]> => {
    this.initialisationCheck();

    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const vaultMulticalls = this.fxTokens.map((t) =>
      this.getVaultMulitcall(account, t.address, signer)
    );

    const collateralBalancesMulticalls = this.fxTokens.map((fxToken) =>
      this.createMulticallObjectForVaultCollateralBalance(account, fxToken.address, signer)
    );

    const vaultsPromise = callMulticallObjects(vaultMulticalls, provider);
    const collateralsPromise = callMulticallObjects(collateralBalancesMulticalls, provider);

    const [vaultData, collaterals] = await Promise.all([vaultsPromise, collateralsPromise]);

    return vaultData.map((vault, index) =>
      this.chainDataToVault(account, this.fxTokens[index].address, vault, collaterals[index])
    );
  };

  public getVault = async (
    account: string,
    fxTokenSymbol: FxTokenSymbol,
    signer: ethers.Signer
  ): Promise<Vault> => {
    this.initialisationCheck();

    const provider = new MultiCallProvider(signer.provider!, this.config.chainId);

    const fxToken = this.fxTokens.find((t) => t.symbol === fxTokenSymbol);

    if (!fxToken) {
      throw new Error(`Could not find fxToken with symbol: ${fxTokenSymbol}`);
    }

    const vaultMulticall = this.getVaultMulitcall(account, fxToken.address, signer);
    const collateralBalanceMulticall = this.createMulticallObjectForVaultCollateralBalance(
      account,
      fxToken.address,
      signer
    );
    const vaultMulticallPromise = callMulticallObject(vaultMulticall, provider);

    const collateralMulticallResponsePromise = callMulticallObject(
      collateralBalanceMulticall,
      provider
    );

    const [vaultData, collateralData] = await Promise.all([
      vaultMulticallPromise,
      collateralMulticallResponsePromise
    ]);

    return this.chainDataToVault(account, fxToken.address, vaultData, collateralData);
  };

  public getSingleCollateralVault = async (
    account: string,
    vaultSymbol: SingleCollateralVaultSymbol,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<SingleCollateralVault> => {
    this.initialisationCheck();
    const chainId = sdkConfig.networkNameToId[network];

    const provider = new MultiCallProvider(signer.provider!, chainId);

    const pool = this.config.singleCollateralVaults[network][vaultSymbol];

    if (!pool) {
      throw new Error(`Unable to find vault: ${network}-${vaultSymbol}`);
    }

    const fxToken = getFxTokenBySymbol(this.fxTokens, pool.fxToken);
    const multicall = getKashiPoolMulticall(account, pool, chainId);
    const result = await callMulticallObject(multicall, provider);

    return createSingleCollateralVault(
      kashiMulticallResultToSingleCollateralVaultData(account, pool, result),
      fxToken
    );
  };

  public getIndexedVault = async (
    account: string,
    fxTokenSymbol: FxTokenSymbol
  ): Promise<Vault> => {
    this.initialisationCheck();

    const fxToken = getFxTokenBySymbol(this.fxTokens, fxTokenSymbol);

    const indexedVault = await this.graph.vaults.queryOne({
      where: { account: account.toLowerCase(), fxToken: fxToken.address.toLowerCase() }
    });

    return this.indexedDataToVault(
      indexedVault || this.createEmptyIndexedVault(account, fxToken.address)
    );
  };

  public getIndexedVaults = async (account: string): Promise<Vault[]> => {
    this.initialisationCheck();
    const indexedVaults = await this.graph.vaults.query({
      where: { account: account.toLowerCase() }
    });
    const allVaults = this.fxTokens.map((fxToken) => {
      const existingVault = indexedVaults.find(
        (vault) => vault.fxToken.toLowerCase() === fxToken.address.toLowerCase()
      );

      return existingVault || this.createEmptyIndexedVault(account, fxToken.address);
    });
    return allVaults.map(this.indexedDataToVault);
  };

  public getSingleCollateralVaults = async (
    account: string,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<SingleCollateralVault[]> => {
    this.initialisationCheck();
    const chainId = sdkConfig.networkNameToId[network];

    const provider = new MultiCallProvider(signer.provider!, chainId);

    const poolConfigs = this.config.singleCollateralVaults[network];

    const vaultsSymbols = Object.keys(poolConfigs) as SingleCollateralVaultSymbol[];

    const multicalls = vaultsSymbols.map((symbol) =>
      getKashiPoolMulticall(account, poolConfigs[symbol], chainId)
    );

    const results = await callMulticallObjects(multicalls, provider);

    return results.map((r, index) => {
      const poolConfig = poolConfigs[vaultsSymbols[index]];

      const fxToken = getFxTokenBySymbol(this.fxTokens, poolConfig.fxToken);

      return createSingleCollateralVault(
        kashiMulticallResultToSingleCollateralVaultData(account, poolConfig, r),
        fxToken
      );
    });
  };

  public mint(
    args: MintArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public mint(
    args: MintArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public async mint(
    args: MintArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    this.initialisationCheck();
    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);

    const contract = populateTransaction
      ? protocolContracts.comptroller.populateTransaction
      : protocolContracts.comptroller;

    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);
    const deadline = getDeadline(args.deadline);
    const referral = args.referral ?? ethers.constants.AddressZero;

    if (args.collateral) {
      if (args.collateral.symbol === "AETH") {
        return contract.mintWithEth(args.amount, fxToken.address, deadline, referral, {
          ...options,
          value: args.collateral.amount
        });
      }

      const collateral = getCollateralBySymbol(this.collaterals, args.collateral.symbol);

      return contract.mint(
        args.amount,
        fxToken.address,
        collateral.address,
        args.collateral.amount,
        deadline,
        referral,
        options
      );
    }

    return contract.mintWithoutCollateral(
      args.amount,
      fxToken.address,
      deadline,
      referral,
      options
    );
  }

  public mintAndDepositSingleCollateral(
    args: SingleCollateralMintAndDepositArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public mintAndDepositSingleCollateral(
    args: SingleCollateralMintAndDepositArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public async mintAndDepositSingleCollateral(
    args: SingleCollateralMintAndDepositArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    if (!args.mintAmount && !args.depositAmount) {
      throw new Error("Must supply at least one of mintAmount or depositAmount");
    }

    if (args.mintAmount?.isZero() && args.depositAmount?.isZero()) {
      throw new Error("One of mintAmount or depositAmount must be non-zero");
    }

    const kashiPool = this.config.singleCollateralVaults[args.network][args.vaultSymbol];

    if (!kashiPool) {
      throw new Error(`Unable to find vault: ${args.network}-${args.vaultSymbol}`);
    }

    const account = await signer.getAddress();
    const chainId = sdkConfig.networkNameToId[args.network];
    const fxToken = getFxTokenBySymbol(this.fxTokens, kashiPool.fxToken);
    const cooker = new KashiCooker(kashiPool, account, fxToken, chainId);

    if (args.approveKashiSignature) {
      cooker.approve(args.approveKashiSignature);
    }

    if (args.depositAmount?.gt(0)) {
      cooker.addCollateral(args.depositAmount);
    }

    if (args.mintAmount?.gt(0)) {
      cooker.borrow(args.mintAmount);
    }

    return cooker.cook(signer, options, populateTransaction);
  }

  public burnAndWithdrawSingleCollateral(
    args: SingleCollateralBurnAndWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public burnAndWithdrawSingleCollateral(
    args: SingleCollateralBurnAndWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public async burnAndWithdrawSingleCollateral(
    args: SingleCollateralBurnAndWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    if (!args.burnAmount && !args.withdrawAmount) {
      throw new Error("Must supply at least one of mintAmount or depositAmount");
    }

    if (args.burnAmount?.isZero() && args.withdrawAmount?.isZero()) {
      throw new Error("One of mintAmount or depositAmount must be non-zero");
    }

    const kashiPool = this.config.singleCollateralVaults[args.network][args.vaultSymbol];

    if (!kashiPool) {
      throw new Error(`Unable to find vault ${args.network}-${args.vaultSymbol}`);
    }

    const account = await signer.getAddress();
    const chainId = sdkConfig.networkNameToId[args.network];
    const fxToken = getFxTokenBySymbol(this.fxTokens, kashiPool.fxToken);
    const cooker = new KashiCooker(kashiPool, account, fxToken, chainId);

    if (args.burnAmount?.gt(0)) {
      cooker.repay(args.burnAmount);
    }

    if (args.withdrawAmount?.gt(0)) {
      cooker.removeCollateral(args.withdrawAmount);
    }

    return cooker.cook(signer, options, populateTransaction);
  }

  public supplyFxTokenSingleCollateral(
    args: SingleCollateralSupplyFxToken,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public supplyFxTokenSingleCollateral(
    args: SingleCollateralSupplyFxToken,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public async supplyFxTokenSingleCollateral(
    args: SingleCollateralSupplyFxToken,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const kashiPool = this.config.singleCollateralVaults[args.network][args.vaultSymbol];

    if (!kashiPool) {
      throw new Error(`Unable to find vault ${args.network}-${args.vaultSymbol}`);
    }

    const account = await signer.getAddress();
    const chainId = sdkConfig.networkNameToId[args.network];
    const fxToken = getFxTokenBySymbol(this.fxTokens, kashiPool.fxToken);
    const cooker = new KashiCooker(kashiPool, account, fxToken, chainId);

    if (args.approveKashiSignature) {
      cooker.approve(args.approveKashiSignature);
    }

    cooker.addAsset(args.amount);

    return cooker.cook(signer, options, populateTransaction);
  }

  public depositCollateral(
    args: DepositCollateralArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public depositCollateral(
    args: DepositCollateralArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public depositCollateral(
    args: DepositCollateralArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    this.initialisationCheck();
    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);
    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);

    const contract = populateTransaction
      ? protocolContracts.treasury.populateTransaction
      : protocolContracts.treasury;

    const referral = args.referral ?? ethers.constants.AddressZero;

    if (args.collateral === "AETH") {
      return contract.depositCollateralETH(args.account, fxToken.address, referral, {
        ...options,
        value: args.amount
      });
    }

    const collateral = getCollateralBySymbol(this.collaterals, args.collateral);

    return contract.depositCollateral(
      args.account,
      args.amount,
      collateral.address,
      fxToken.address,
      referral,
      options
    );
  }

  public burn(
    args: BurnArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public burn(
    args: BurnArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public burn(
    args: BurnArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    this.initialisationCheck();

    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);
    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);

    const contract = populateTransaction
      ? protocolContracts.comptroller.populateTransaction
      : protocolContracts.comptroller;

    return contract.burn(args.amount, fxToken.address, getDeadline(args.deadline), options);
  }

  public withdrawCollateral(
    args: WithdrawCollateralArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public withdrawCollateral(
    args: WithdrawCollateralArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public withdrawCollateral(
    args: WithdrawCollateralArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    this.initialisationCheck();
    this.initialisationCheck();

    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);
    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);

    const contract = populateTransaction
      ? protocolContracts.treasury.populateTransaction
      : protocolContracts.treasury;

    if (args.collateral === "AETH") {
      return contract.withdrawCollateralETH(args.account, args.amount, fxToken.address, options);
    }

    const collateral = getCollateralBySymbol(this.collaterals, args.collateral);

    return contract.withdrawCollateral(
      collateral.address,
      args.account,
      args.amount,
      fxToken.address,
      options
    );
  }

  private getVaultMulitcall = (
    account: string,
    fxTokenAddress: string,
    signer: ethers.Signer
  ): Promisified<VaultMulticall> => {
    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    return {
      debt: contracts.handle.getDebt(account, fxTokenAddress)
    };
  };

  private createMulticallObjectForVaultCollateralBalance = (
    account: string,
    fxTokenAddress: string,
    signer: ethers.Signer
  ): vaultCollateralMulticall => {
    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    return this.collaterals.reduce((progress, collateral) => {
      return {
        ...progress,
        [collateral.symbol]: contracts.handle.getCollateralBalance(
          account,
          collateral.address,
          fxTokenAddress
        )
      };
    }, {} as vaultCollateralMulticall);
  };

  private chainDataToVault = (
    account: string,
    fxTokenAddress: string,
    vault: VaultMulticall,
    collateralMap: CollateralSymbolMap<ethers.BigNumber>
  ): Vault => {
    const { debt } = vault;

    const collateral = this.collaterals.map((c) => ({
      ...c,
      amount: collateralMap[c.symbol]
    }));

    const fxToken = getFxTokenByAddress(this.fxTokens, fxTokenAddress);

    const vaultData: VaultData = {
      account: account.toLowerCase(),
      fxToken: fxToken,
      debt,
      collateral
    };

    return createVault(vaultData, this.protocolParameters, fxToken, this.collaterals);
  };

  private indexedDataToVault = (vault: IndexedVault): Vault => {
    const fxToken = getFxTokenByAddress(this.fxTokens, vault.fxToken);

    const collateral = vault.collateralTokens.map((c) => {
      const collateral = getCollateralByAddress(this.collaterals, c.address);
      return {
        address: c.address.toLowerCase(),
        symbol: collateral.symbol,
        amount: ethers.BigNumber.from(c.amount),
        decimals: collateral.decimals
      };
    });

    const vaultData: VaultData = {
      account: vault.account.toLowerCase(),
      fxToken: fxToken,
      debt: ethers.BigNumber.from(vault.debt),
      collateral
    };

    return createVault(vaultData, this.protocolParameters, fxToken, this.collaterals);
  };

  private initialisationCheck = () => {
    if (!this.initialised) {
      throw new Error("Vaults SDK not initialised");
    }
  };

  private createEmptyIndexedVault = (account: string, fxTokenAddress: string): IndexedVault => {
    return {
      account: account,
      fxToken: fxTokenAddress,
      debt: "0",
      redeemableTokens: "0",
      collateralAsEther: "0",
      collateralRatio: "0",
      minimumRatio: "0",
      isRedeemable: false,
      isLiquidatable: false,
      collateralTokens: this.collaterals.map((c) => ({
        address: c.address,
        amount: "0"
      }))
    };
  };
}
