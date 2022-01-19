import { ethers } from "ethers";
import Graph, { IndexedVault } from "./Graph";
import { FxToken, FxTokenSymbol } from "../types/fxTokens";
import { Collateral, CollateralSymbolWithNative } from "../types/collaterals";
import { Vault } from "../types/vaults";
import { ProtocolAddresses, FxTokenAddresses, CollateralAddresses } from "../config";
import {
  createMulticallProtocolContracts,
  createProtocolContracts,
  callMulticallObject,
  callMulticallObjects
} from "../utils/contract-utils";
import { Promisified } from "../types/general";
import { CollateralSymbol, CollateralSymbolMap } from "../types/collaterals";
import sdkConfig from "../config";
import CollateralsSDK from "./Collaterals";
import FxTokensSDK from "./FxTokens";
import { createVault, getDeadline } from "../utils/vault-utils";
import { getFxTokenByAddress, getFxTokenBySymbol } from "../utils/fxToken-utils";
import { getCollateralByAddress, getCollateralBySymbol } from "../utils/collateral-utils";
import { ProtocolSDK } from "..";
import { ProtocolParameters } from "./Protocol";

export type VaultsConfig = {
  protocolAddresses: ProtocolAddresses;
  fxTokenAddresses: FxTokenAddresses;
  collateralAddresses: CollateralAddresses;
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
      protocolAddresses: sdkConfig.byNetwork.arbitrum.addresses.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      collateralAddresses: sdkConfig.byNetwork.arbitrum.addresses.collaterals,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.byNetwork.arbitrum.theGraphEndpoint
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
      this.chainDataToVaultData(account, this.fxTokens[index].address, vault, collaterals[index])
    );
  };

  public getVault = async (
    account: string,
    fxTokenSymbol: FxTokenSymbol,
    signer: ethers.Signer
  ): Promise<Vault> => {
    this.initialisationCheck();
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

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

    return this.chainDataToVaultData(account, fxToken.address, vaultData, collateralData);
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

  public mint = async (
    args: MintArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    return this.mintInternal(args, signer, options, false) as unknown as ethers.ContractTransaction;
  };

  public mintPopulate = async (
    args: MintArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.PopulatedTransaction> => {
    return this.mintInternal(args, signer, options, true) as unknown as ethers.PopulatedTransaction;
  };

  public depositCollateral = async (
    args: DepositCollateralArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    return this.depositCollateralInternal(
      args,
      signer,
      options,
      false
    ) as unknown as ethers.ContractTransaction;
  };

  public depositCollateralPopulate = async (
    args: DepositCollateralArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.PopulatedTransaction> => {
    return this.depositCollateralInternal(
      args,
      signer,
      options,
      true
    ) as unknown as ethers.PopulatedTransaction;
  };

  public burn = async (
    args: BurnArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    return this.burnInternal(args, signer, options, false) as unknown as ethers.ContractTransaction;
  };

  public burnPopulate = async (
    args: BurnArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.PopulatedTransaction> => {
    return this.burnInternal(args, signer, options, true) as unknown as ethers.PopulatedTransaction;
  };

  public withdrawCollateral = async (
    args: WithdrawCollateralArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> =>
    this.withdrawCollateralInternal(
      args,
      signer,
      options,
      false
    ) as unknown as ethers.ContractTransaction;

  public withdrawCollateralPopulate = async (
    args: WithdrawCollateralArguments,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.PopulatedTransaction> =>
    this.withdrawCollateralInternal(
      args,
      signer,
      options,
      true
    ) as unknown as ethers.PopulatedTransaction;

  private mintInternal = async (
    args: MintArguments,
    signer: ethers.Signer,
    options: ethers.Overrides,
    populateTransaction: boolean
  ): Promise<ethers.PopulatedTransaction | ethers.ContractTransaction> => {
    this.initialisationCheck();
    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);

    const contract = populateTransaction
      ? protocolContracts.comptroller.populateTransaction
      : protocolContracts.comptroller;

    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);
    const deadline = getDeadline(args.deadline);
    const referral = args.referral ?? ethers.constants.AddressZero;

    if (args.collateral) {
      if (args.collateral.symbol === "NATIVE") {
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
  };

  private depositCollateralInternal = (
    args: DepositCollateralArguments,
    signer: ethers.Signer,
    options: ethers.Overrides,
    populateTransaction: boolean
  ) => {
    this.initialisationCheck();
    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);
    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);

    const contract = populateTransaction
      ? protocolContracts.treasury.populateTransaction
      : protocolContracts.treasury;

    const referral = args.referral ?? ethers.constants.AddressZero;

    if (args.collateral === "NATIVE") {
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
  };

  private burnInternal = async (
    args: BurnArguments,
    signer: ethers.Signer,
    options: ethers.Overrides,
    populateTransaction: boolean
  ) => {
    this.initialisationCheck();

    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);
    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);

    const contract = populateTransaction
      ? protocolContracts.comptroller.populateTransaction
      : protocolContracts.comptroller;

    return await contract.burn(args.amount, fxToken.address, getDeadline(args.deadline), options);
  };

  private withdrawCollateralInternal = async (
    args: WithdrawCollateralArguments,
    signer: ethers.Signer,
    options: ethers.Overrides,
    populateTransaction: boolean
  ) => {
    this.initialisationCheck();

    const protocolContracts = createProtocolContracts(this.config.protocolAddresses, signer);
    const fxToken = getFxTokenBySymbol(this.fxTokens, args.fxToken);

    const contract = populateTransaction
      ? protocolContracts.treasury.populateTransaction
      : protocolContracts.treasury;

    if (args.collateral === "NATIVE") {
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
  };

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

  private chainDataToVaultData = (
    account: string,
    fxTokenAddress: string,
    vault: VaultMulticall,
    collateralMap: CollateralSymbolMap<ethers.BigNumber>
  ): Vault => {
    const { debt } = vault;

    const collateral = Object.keys(collateralMap).map((key) => {
      const symbol = key as CollateralSymbol;
      const address = this.config.collateralAddresses[symbol]!;
      return {
        symbol,
        address: address.toLowerCase(),
        amount: collateralMap[symbol]
      };
    });

    const fxToken = getFxTokenByAddress(this.fxTokens, fxTokenAddress);

    return createVault(
      {
        account: account.toLowerCase(),
        fxToken: {
          symbol: fxToken.symbol,
          address: fxTokenAddress
        },
        debt,
        collateral
      },
      this.protocolParameters,
      fxToken,
      this.collaterals
    );
  };

  private indexedDataToVault = (vault: IndexedVault): Vault => {
    const fxToken = getFxTokenByAddress(this.fxTokens, vault.fxToken);

    return createVault(
      {
        account: vault.account.toLowerCase(),
        fxToken: {
          symbol: fxToken.symbol,
          address: fxToken.address
        },
        debt: ethers.BigNumber.from(vault.debt),
        collateral: vault.collateralTokens.map((c) => {
          const collateral = getCollateralByAddress(this.collaterals, c.address);
          return {
            address: c.address.toLowerCase(),
            symbol: collateral.symbol,
            amount: ethers.BigNumber.from(c.amount)
          };
        })
      },
      this.protocolParameters,
      fxToken,
      this.collaterals
    );
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
