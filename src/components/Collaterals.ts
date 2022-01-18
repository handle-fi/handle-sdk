import { ethers } from "ethers";
import { ContractCall } from "ethers-multicall";
import { CollateralAddresses, ProtocolAddresses } from "../config";
import { getAvailableAddresses } from "../utils/fxToken-utils";
import { Promisified } from "../types/general";
import { Collateral, CollateralSymbol } from "../types/collaterals";
import sdkConfig from "../config";
import {
  createERC20MulticallContract,
  createMulticallProtocolContracts,
  createMulticallData,
  multicallResponsesToObjects
} from "../utils/contract-utils";
import Graph, { IndexedCollateral } from "./Graph";
import { ERC20__factory } from "../contracts";

export type CollateralsConfig = {
  protocolAddresses: ProtocolAddresses;
  collateralAddresses: Partial<CollateralAddresses>;
  chainId: number;
  graphEndpoint: string;
};

type CollateralMulticallRequestAndResponse = {
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
      protocolAddresses: sdkConfig.byNetwork.arbitrum.addresses.protocol,
      collateralAddresses: sdkConfig.byNetwork.arbitrum.addresses.collaterals,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.byNetwork.arbitrum.theGraphEndpoint
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

    const multicalldata = this.getMulticallsForCollateral(collateralSymbol, signer);
    const response = await provider.all(multicalldata.calls);

    const raw = multicallResponsesToObjects<CollateralMulticallRequestAndResponse>(
      multicalldata.properties,
      response
    )[0];

    const avail = this.findAvailable(collateralSymbol);

    return this.toCollateral(avail, raw);
  };

  public getCollaterals = async (signer: ethers.Signer): Promise<Collateral[]> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicallData = this.available.map((a) =>
      this.getMulticallsForCollateral(a.symbol, signer)
    );

    const calls = multicallData.reduce(
      (progress, cd) => [...progress, ...cd.calls],
      [] as ContractCall[]
    );

    const response = await provider.all(calls);

    const raw = multicallResponsesToObjects<CollateralMulticallRequestAndResponse>(
      multicallData[0].properties,
      response
    );

    return raw.map((c, index) => this.toCollateral(this.available[index], c));
  };

  public getIndexedCollaterals = async (): Promise<Collateral[]> => {
    const collaterals = await this.graph.collateralGraphClient.query({});
    return collaterals.map(this.indexedToCollateral);
  };

  public getTreasuryAllowance = async (
    collateralSymbol: CollateralSymbol,
    account: string,
    signer: ethers.Signer
  ) => {
    const contract = this.getCollateralContract(collateralSymbol, signer);
    return contract.allowance(account, this.config.protocolAddresses.comptroller);
  };

  setTreasuryAllowance = async (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> => {
    return this.setTreasureAllowanceInternal(
      collateralSymbol,
      amount,
      signer,
      false
    ) as Promise<ethers.ContractTransaction>;
  };

  setTreasuryAllowancePopulate = async (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<ethers.PopulatedTransaction> => {
    return this.setTreasureAllowanceInternal(
      collateralSymbol,
      amount,
      signer,
      true
    ) as Promise<ethers.PopulatedTransaction>;
  };

  private setTreasureAllowanceInternal = async (
    collateralSymbol: CollateralSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction: boolean
  ) => {
    const collateralContract = this.getCollateralContract(collateralSymbol, signer);
    const contract = populateTransaction
      ? collateralContract.populateTransaction
      : collateralContract;
    return contract.approve(this.config.protocolAddresses.comptroller, amount);
  };

  private getCollateralContract = (collateralSymbol: CollateralSymbol, signer: ethers.Signer) => {
    const avail = this.findAvailable(collateralSymbol);
    return ERC20__factory.connect(avail.address, signer);
  };

  private getMulticallsForCollateral = (
    collateral: CollateralSymbol,
    signer: ethers.Signer
  ): { calls: ContractCall[]; properties: (keyof CollateralMulticallRequestAndResponse)[] } => {
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

    const calls: Promisified<CollateralMulticallRequestAndResponse> = {
      decimals: erc20MulticallContract.decimals(),
      collateralDetails: contracts.handle.getCollateralDetails(collateralAddress),
      price: contracts.handle.getTokenPrice(collateralAddress)
    };

    return createMulticallData(calls);
  };

  private toCollateral = (
    addressAndSymbol: Available,
    collateral: CollateralMulticallRequestAndResponse
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
