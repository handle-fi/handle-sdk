import { ethers } from "ethers";
import { CollateralDetails, ProtocolAddresses } from "../config";
import { Promisified } from "../types/general";
import { Collateral, CollateralSymbol, CollateralToken } from "../types/collaterals";
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
import { getTokensFromConfig } from "../utils/collateral-utils";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";

export type CollateralsConfig = {
  protocolAddresses: ProtocolAddresses;
  collaterals: Partial<CollateralDetails>;
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

export default class Collaterals {
  public tokens: CollateralToken[];
  private config: CollateralsConfig;
  private graph: Graph;

  constructor(c?: CollateralsConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      collaterals: sdkConfig.protocol.arbitrum.collaterals,
      chainId: NETWORK_NAME_TO_CHAIN_ID.arbitrum,
      graphEndpoint: sdkConfig.theGraphEndpoints.arbitrum
    };
    this.tokens = getTokensFromConfig(
      Object.values(this.config.collaterals).map(({ address }) => address)
    );
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

    const collateralMulticalls = this.tokens.map((a) =>
      this.getCollateralMulticall(a.symbol, signer)
    );
    const raw = await callMulticallObjects(collateralMulticalls, provider);
    return raw.map((c, index) => this.toCollateral(this.tokens[index], c));
  };

  public getIndexedCollaterals = async (): Promise<Collateral[]> => {
    const collaterals = await this.graph.collateralGraphClient.query({});
    return collaterals.map(this.indexedToCollateral).filter((col) => {
      return this.tokens.find((t) => t.address.toLowerCase() === col.address.toLowerCase());
    });
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
    const chainId = NETWORK_NAME_TO_CHAIN_ID[network];
    return collateral.allowance(account, BENTOBOX_ADDRESS[chainId]);
  };

  public setDepositAllowance = (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    action: "deposit" | "mintAndDeposit",
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    const collateralContract = this.getCollateralContract(collateralSymbol, signer);

    return collateralContract.approve(
      action === "deposit"
        ? this.config.protocolAddresses.treasury
        : this.config.protocolAddresses.comptroller,
      amount,
      options
    );
  };

  public setSingleCollateralDepositAllowance = (
    vaultSymbol: SingleCollateralVaultSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    const kashiPool = sdkConfig.singleCollateralVaults[network][vaultSymbol];

    if (!kashiPool) {
      throw new Error(`Unable to find vault: ${network}-${vaultSymbol}`);
    }

    const collateral = ERC20__factory.connect(kashiPool.collateral.address, signer);
    const chainId = NETWORK_NAME_TO_CHAIN_ID[network];
    return collateral.approve(BENTOBOX_ADDRESS[chainId], amount, options);
  };

  private getCollateralContract = (collateralSymbol: CollateralSymbol, signer: ethers.Signer) => {
    const avail = this.findAvailable(collateralSymbol);
    return ERC20__factory.connect(avail.address, signer);
  };

  private getCollateralMulticall = (
    collateralSymbol: CollateralSymbol,
    signer: ethers.Signer
  ): Promisified<CollateralMulticall> => {
    const collateralAddress = this.config.collaterals[collateralSymbol]?.address;

    if (!collateralAddress) {
      throw new Error(
        `Collaterals not initialised with collateral that matches: ${collateralSymbol}`
      );
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

  private toCollateral = (token: CollateralToken, collateral: CollateralMulticall): Collateral => {
    const { decimals, collateralDetails, price } = collateral;

    return {
      symbol: token.symbol,
      address: token.address,
      decimals,
      price,
      mintCR: collateralDetails.mintCR,
      liquidationFee: collateralDetails.liquidationFee,
      interestRate: collateralDetails.interestRate,
      chainId: token.chainId,
      name: token.name
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
      price: collateral.rate,
      name: collateral.name,
      chainId: collateral.chainId
    };
  };

  private findAvailable = (collateralSymbol: CollateralSymbol): CollateralToken => {
    const avail = this.tokens.find((a) => a.symbol === collateralSymbol);

    if (!avail) {
      throw new Error(
        `Collaterals not initialised with collateral that matches: ${collateralSymbol}`
      );
    }

    return avail;
  };
}
