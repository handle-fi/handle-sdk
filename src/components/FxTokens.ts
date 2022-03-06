import { ethers } from "ethers";
import { FxTokenAddresses, ProtocolAddresses } from "../config";
import { ERC20__factory } from "../contracts";
import { FxToken, FxTokenSymbol } from "../types/fxTokens";
import { callMulticallObjects, createMulticallProtocolContracts } from "../utils/contract-utils";
import { getTokensFromAddresses } from "../utils/fxToken-utils";
import sdkConfig from "../config";
import { Promisified } from "../types/general";
import { Token } from "../types/tokens";
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

export default class FxTokens {
  public tokens: Token<FxTokenSymbol>[];
  private config: FxTokensConfig;
  private graph: Graph;

  constructor(c?: FxTokensConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.theGraphEndpoints.arbitrum
    };

    this.tokens = getTokensFromAddresses(this.config.fxTokenAddresses).map((t) => ({
      ...t,
      decimals: 18
    }));
    this.graph = new Graph(this.config.graphEndpoint);
  }

  public getFxTokens = async (signer: ethers.Signer): Promise<FxToken[]> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicalls = this.tokens.map((a) => this.getFxTokenMulticall(a.symbol, signer));
    const raw = await callMulticallObjects(multicalls, provider);
    return raw.map((t, index) => this.onChainToFxToken(this.tokens[index], t));
  };

  public getIndexedFxTokens = async (): Promise<FxToken[]> => {
    const fxTokens = await this.graph.fxTokens.query({});
    return fxTokens
      .map(this.indexedToFxToken)
      .filter((fx) =>
        this.tokens.find((t) => t.address.toLowerCase() === fx.address.toLowerCase())
      );
  };

  public getRepayAllowance = (fxToken: FxTokenSymbol, account: string, signer: ethers.Signer) => {
    const contract = this.getFxTokenContract(fxToken, signer);
    return contract.allowance(account, this.config.protocolAddresses.comptroller);
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

  public setRepayAllowance(
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public setRepayAllowance(
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public setRepayAllowance(
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const fxContract = this.getFxTokenContract(fxTokenSymbol, signer);
    const contract = populateTransaction ? fxContract.populateTransaction : fxContract;
    return contract.approve(this.config.protocolAddresses.comptroller, amount, options);
  }

  public setSingleCollateralRepayAllowance(
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public setSingleCollateralRepayAllowance(
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public setSingleCollateralRepayAllowance(
    fxTokenSymbol: FxTokenSymbol,
    amount: ethers.BigNumber,
    network: SingleCollateralVaultNetwork,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const fxContract = this.getFxTokenContract(fxTokenSymbol, signer);
    const contract = populateTransaction ? fxContract.populateTransaction : fxContract;
    const chainId = sdkConfig.networkNameToId[network];
    return contract.approve(BENTOBOX_ADDRESS[chainId], amount, options);
  }

  private getFxTokenMulticall = (
    fxTokenSymbol: FxTokenSymbol,
    signer: ethers.Signer
  ): Promisified<FxTokenMulticallMulticall> => {
    const tokenAddress = this.config.fxTokenAddresses[fxTokenSymbol];
    if (!tokenAddress) {
      throw new Error(`fxTokens not initialised with token that matches: ${fxTokenSymbol}`);
    }

    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    return {
      price: contracts.handle.getTokenPrice(tokenAddress)
    };
  };

  private onChainToFxToken = (
    token: Token<FxTokenSymbol>,
    fxToken: FxTokenMulticallMulticall
  ): FxToken => {
    const { price } = fxToken;

    return {
      symbol: token.symbol,
      address: token.address,
      decimals: token.decimals,
      price
    };
  };

  private indexedToFxToken = (fxToken: IndexedFxToken): FxToken => {
    return {
      symbol: fxToken.symbol,
      address: fxToken.address,
      decimals: fxToken.decimals,
      price: fxToken.rate
    };
  };

  private getFxTokenContract = (fxTokenSymbol: FxTokenSymbol, signer: ethers.Signer) => {
    const tokenAddress = this.config.fxTokenAddresses[fxTokenSymbol];
    if (!tokenAddress) {
      throw new Error(`fxTokens not initialised with token that matches: ${fxTokenSymbol}`);
    }
    return ERC20__factory.connect(tokenAddress, signer);
  };
}
