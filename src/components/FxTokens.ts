import { ethers } from "ethers";
import { FxTokenAddresses, ProtocolAddresses } from "../config";
import { ERC20, ERC20__factory } from "../contracts";
import { FxToken, FxTokenSymbol, FxTokenSymbolMap } from "../types/fxTokens";
import { callMulticallObjects, createMulticallProtocolContracts } from "../utils/contract-utils";
import { getAvailableAddresses } from "../utils/fxToken-utils";
import sdkConfig from "../config";
import { Promisified } from "../types/general";
import Graph, { IndexedFxToken } from "./Graph";
import { SingleCollateralVaultNetwork } from "..";
import { BENTOBOX_ADDRESS } from "@sushiswap/core-sdk";

export type FxTokensConfig = {
  protocolAddresses: ProtocolAddresses;
  fxTokenAddresses: FxTokenAddresses;
  chainId: number;
  graphEndpoint: string;
};

type FxTokenMulticallMulticall = {
  price: ethers.BigNumber;
};

type Available = {
  symbol: FxTokenSymbol;
  address: string;
};
export default class FxTokens {
  public available: Available[];
  private config: FxTokensConfig;
  private graph: Graph;

  constructor(c?: FxTokensConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocolAddress.arbitrum.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.theGraphEndpoints.arbitrum
    };

    this.available = getAvailableAddresses(this.config.fxTokenAddresses);
    this.graph = new Graph(this.config.graphEndpoint);
  }

  public getFxTokens = async (signer: ethers.Signer): Promise<FxToken[]> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicalls = this.available.map((a) => this.getFxTokenMulticall(a.symbol, signer));
    const raw = await callMulticallObjects(multicalls, provider);
    return raw.map((t, index) => this.onChainToFxToken(this.available[index], t));
  };

  public getIndexedFxTokens = async (): Promise<FxToken[]> => {
    const fxTokens = await this.graph.fxTokens.query({});
    return fxTokens.map(this.indexedToFxToken);
  };

  public createFxTokenContracts = (signer: ethers.Signer) => {
    return Object.keys(this.config.fxTokenAddresses).reduce((progress, key) => {
      const symbol = key as FxTokenSymbol;
      return {
        ...progress,
        [key]: ERC20__factory.connect(this.config.fxTokenAddresses[symbol], signer)
      };
    }, {} as FxTokenSymbolMap<ERC20>);
  };

  public getRepayAllowance = (fxToken: FxTokenSymbol, account: string, signer: ethers.Signer) => {
    const contract = this.getFxTokenContract(fxToken, signer);
    return contract.allowance(account, this.config.protocolAddresses.comptroller);
  };

  public setRepayAllowance = async (
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> => {
    return this.setRepayAllowanceInternal(
      fxTokenSymbol,
      amount,
      signer,
      false
    ) as Promise<ethers.ContractTransaction>;
  };

  public setRepayAllowancePopulate = async (
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<ethers.PopulatedTransaction> => {
    return this.setRepayAllowanceInternal(
      fxTokenSymbol,
      amount,
      signer,
      true
    ) as Promise<ethers.PopulatedTransaction>;
  };

  public getSingleCollateralRepayAllowance = (
    fxToken: FxTokenSymbol,
    account: string,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ) => {
    const contract = this.getFxTokenContract(fxToken, signer);
    const chainId = sdkConfig.networkNameToId[network];
    return contract.allowance(account, BENTOBOX_ADDRESS[chainId]);
  };

  public setSingleCollateralRepayAllowance = async (
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> => {
    return this.setSingleCollateralRepayAllowanceInternal(
      fxTokenSymbol,
      amount,
      network,
      signer,
      false
    ) as Promise<ethers.ContractTransaction>;
  };

  public setSingleCollateralRepayAllowancePropulate = async (
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer
  ): Promise<ethers.PopulatedTransaction> => {
    return this.setSingleCollateralRepayAllowanceInternal(
      fxTokenSymbol,
      amount,
      network,
      signer,
      true
    ) as Promise<ethers.PopulatedTransaction>;
  };

  private setRepayAllowanceInternal = async (
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction: boolean
  ) => {
    const fxContract = this.getFxTokenContract(fxTokenSymbol, signer);
    const contract = populateTransaction ? fxContract.populateTransaction : fxContract;
    return contract.approve(this.config.protocolAddresses.comptroller, amount);
  };

  private setSingleCollateralRepayAllowanceInternal = (
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer,
    populateTransaction: boolean
  ) => {
    const fxContract = this.getFxTokenContract(fxTokenSymbol, signer);
    const contract = populateTransaction ? fxContract.populateTransaction : fxContract;
    const chainId = sdkConfig.networkNameToId[network];
    return contract.approve(BENTOBOX_ADDRESS[chainId], amount);
  };

  private getFxTokenMulticall = (
    fxToken: FxTokenSymbol,
    signer: ethers.Signer
  ): Promisified<FxTokenMulticallMulticall> => {
    const fxAddress = this.config.fxTokenAddresses[fxToken];

    if (!fxAddress) {
      throw new Error(`fxTokens not initialised with token that matches: ${fxToken}`);
    }

    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    return {
      price: contracts.handle.getTokenPrice(fxAddress)
    };
  };

  private onChainToFxToken = (
    addressAndSymbol: Available,
    fxToken: FxTokenMulticallMulticall
  ): FxToken => {
    const { price } = fxToken;

    return {
      symbol: addressAndSymbol.symbol,
      address: addressAndSymbol.address,
      price,
      decimals: 18
    };
  };

  private indexedToFxToken = (fxToken: IndexedFxToken): FxToken => {
    return {
      symbol: fxToken.symbol,
      address: fxToken.address,
      price: fxToken.rate,
      decimals: 18
    };
  };

  private getFxTokenContract = (fxTokenSymbol: FxTokenSymbol, signer: ethers.Signer) => {
    const avail = this.findAvailable(fxTokenSymbol);
    return ERC20__factory.connect(avail.address, signer);
  };

  private findAvailable = (fxTokenSymbol: FxTokenSymbol): Available => {
    const avail = this.available.find((a) => a.symbol === fxTokenSymbol);

    if (!avail) {
      throw new Error(`FxTokens not initialised with collateral that matches: ${fxTokenSymbol}`);
    }

    return avail;
  };
}
