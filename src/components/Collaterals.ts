import { ethers } from "ethers";
import { CollateralAddresses, ProtocolAddresses } from "../config";
import { getAvailableAddresses } from "../utils/fxToken-utils";
import { Promisified } from "../types/general";
import { Collateral, CollateralSymbol } from "../types/collaterals";
import sdkConfig from "../config";
import {
  createERC20MulticallContract,
  createMulticallProtocolContracts,
  callMulticallObject,
  callMulticallObjects
} from "../utils/contract-utils";
import Graph, { IndexedCollateral } from "./Graph";
import { ERC20__factory } from "../contracts";
import { SingleCollateralVaultNetwork, SingleCollateralVaultSymbol } from "..";
import { BENTOBOX_ADDRESS } from "@sushiswap/core-sdk";

export type CollateralsConfig = {
  protocolAddresses: ProtocolAddresses;
  collateralAddresses: Partial<CollateralAddresses>;
  chainId: number;
  graphEndpoint: string;
};

type CollateralMulticall = {
  decimals: number;
  collateralDetails: {
    mintCR: ethers.BigNumber;
    liquidationFee: ethers.BigNumber;
    interestRate: ethers.BigNumber;
  };
  price: ethers.BigNumber;
};

type Available = {
  symbol: CollateralSymbol;
  address: string;
};

export default class Collaterals {
  public available: Available[];
  private config: CollateralsConfig;
  private graph: Graph;

  constructor(c?: CollateralsConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocolAddress.arbitrum.protocol,
      collateralAddresses: sdkConfig.protocolAddress.arbitrum.collaterals,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.theGraphEndpoints.arbitrum
    };
    this.available = getAvailableAddresses(this.config.collateralAddresses);
    this.graph = new Graph(this.config.graphEndpoint);
  }

  public getCollateral = async (
    collateralSymbol: CollateralSymbol,
    signer: ethers.Signer
  ): Promise<Collateral> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );
    const collateral = this.findAvailable(collateralSymbol);
    const collateralMulticall = this.getCollateralMulticall(collateralSymbol, signer);
    const rawCollateral = await callMulticallObject(collateralMulticall, provider);
    return this.toCollateral(collateral, rawCollateral);
  };

  public getCollaterals = async (signer: ethers.Signer): Promise<Collateral[]> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const collateralMulticalls = this.available.map((a) =>
      this.getCollateralMulticall(a.symbol, signer)
    );
    const raw = await callMulticallObjects(collateralMulticalls, provider);
    return raw.map((c, index) => this.toCollateral(this.available[index], c));
  };

  public getIndexedCollaterals = async (): Promise<Collateral[]> => {
    const collaterals = await this.graph.collateralGraphClient.query({});
    return collaterals.map(this.indexedToCollateral);
  };

  public getDepositAllowance = async (
    collateralSymbol: CollateralSymbol,
    account: string,
    action: "deposit" | "mintAndDeposit",
    signer: ethers.Signer
  ) => {
    const contract = this.getCollateralContract(collateralSymbol, signer);
    return contract.allowance(
      account,
      action === "deposit"
        ? this.config.protocolAddresses.treasury
        : this.config.protocolAddresses.comptroller
    );
  };

  public getSingleCollateralDepositAllowance = async (
    vaultSymbol: SingleCollateralVaultSymbol,
    account: string,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<ethers.BigNumber> => {
    const kashiPool = sdkConfig.singleCollateralVaults[network][vaultSymbol];

    if (!kashiPool) {
      throw new Error(`Unable to find vault: ${network}-${vaultSymbol}`);
    }

    const collateral = ERC20__factory.connect(kashiPool.collateral.address, signer);
    const chainId = sdkConfig.networkNameToId[network];
    return collateral.allowance(account, BENTOBOX_ADDRESS[chainId]);
  };

  public setDepositAllowance = async (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    action: "deposit" | "mintAndDeposit",
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> => {
    return this.setDepositAllowanceInternal(
      collateralSymbol,
      amount,
      action,
      signer,
      false
    ) as Promise<ethers.ContractTransaction>;
  };

  public setDepositAllowancePopulate = async (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    action: "deposit" | "mintAndDeposit",
    signer: ethers.Signer
  ): Promise<ethers.PopulatedTransaction> => {
    return this.setDepositAllowanceInternal(
      collateralSymbol,
      amount,
      action,
      signer,
      true
    ) as Promise<ethers.PopulatedTransaction>;
  };

  public setSingleCollateralDepositAllowance = (
    vaultSymbol: SingleCollateralVaultSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> =>
    this.setSingleCollateralDepositAllowanceInternal(
      vaultSymbol,
      amount,
      network,
      signer,
      false
    ) as unknown as Promise<ethers.ContractTransaction>;

  public setSingleCollateralDepositAllowancePopulate = (
    vaultSymbol: SingleCollateralVaultSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<ethers.PopulatedTransaction> =>
    this.setSingleCollateralDepositAllowanceInternal(
      vaultSymbol,
      amount,
      network,
      signer,
      true
    ) as unknown as Promise<ethers.PopulatedTransaction>;

  private setDepositAllowanceInternal = async (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    action: "deposit" | "mintAndDeposit",
    signer: ethers.Signer,
    populateTransaction: boolean
  ) => {
    const collateralContract = this.getCollateralContract(collateralSymbol, signer);
    const contract = populateTransaction
      ? collateralContract.populateTransaction
      : collateralContract;
    return contract.approve(
      action === "deposit"
        ? this.config.protocolAddresses.treasury
        : this.config.protocolAddresses.comptroller,
      amount
    );
  };

  private setSingleCollateralDepositAllowanceInternal = async (
    vaultSymbol: SingleCollateralVaultSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer,
    populateTransaction: boolean
  ) => {
    const kashiPool = sdkConfig.singleCollateralVaults[network][vaultSymbol];

    if (!kashiPool) {
      throw new Error(`Unable to find vault: ${network}-${vaultSymbol}`);
    }

    const collateral = ERC20__factory.connect(kashiPool.collateral.address, signer);
    const chainId = sdkConfig.networkNameToId[network];
    const contract = populateTransaction ? collateral.populateTransaction : collateral;
    return contract.approve(BENTOBOX_ADDRESS[chainId], amount);
  };

  private getCollateralContract = (collateralSymbol: CollateralSymbol, signer: ethers.Signer) => {
    const avail = this.findAvailable(collateralSymbol);
    return ERC20__factory.connect(avail.address, signer);
  };

  private getCollateralMulticall = (
    collateral: CollateralSymbol,
    signer: ethers.Signer
  ): Promisified<CollateralMulticall> => {
    const collateralAddress = this.config.collateralAddresses[collateral];

    if (!collateralAddress) {
      throw new Error(`Collaterals not initialised with collateral that matches: ${collateral}`);
    }

    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const erc20MulticallContract = createERC20MulticallContract(collateralAddress);

    return {
      decimals: erc20MulticallContract.decimals(),
      collateralDetails: contracts.handle.getCollateralDetails(collateralAddress),
      price: contracts.handle.getTokenPrice(collateralAddress)
    };
  };

  private toCollateral = (
    addressAndSymbol: Available,
    collateral: CollateralMulticall
  ): Collateral => {
    const { decimals, collateralDetails, price } = collateral;

    return {
      symbol: addressAndSymbol.symbol,
      address: addressAndSymbol.address,
      decimals,
      mintCR: collateralDetails.mintCR,
      liquidationFee: collateralDetails.liquidationFee,
      interestRate: collateralDetails.interestRate,
      price
    };
  };

  private indexedToCollateral = (collateral: IndexedCollateral): Collateral => {
    return {
      symbol: collateral.symbol,
      address: collateral.address,
      decimals: collateral.decimals,
      mintCR: collateral.mintCollateralRatio,
      liquidationFee: collateral.liquidationFee,
      interestRate: collateral.interestRate,
      price: collateral.rate
    };
  };

  private findAvailable = (collateralSymbol: CollateralSymbol): Available => {
    const avail = this.available.find((a) => a.symbol === collateralSymbol);

    if (!avail) {
      throw new Error(
        `Collaterals not initialised with collateral that matches: ${collateralSymbol}`
      );
    }

    return avail;
  };
}
