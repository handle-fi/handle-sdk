import { ethers } from "ethers";
import { FxTokenAddresses, ProtocolAddresses } from "../config";
import { ERC20, ERC20__factory } from "../contracts";
import { FxToken, FxTokenSymbol, FxTokenSymbolMap } from "../types/fxTokens";
import { callMulticallObjects, createMulticallProtocolContracts } from "../utils/contract-utils";
import { getAvailableAddresses } from "../utils/fxToken-utils";
import sdkConfig from "../config";
import { Promisified } from "../types/general";
import Graph, { IndexedFxToken } from "./Graph";

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
      protocolAddresses: sdkConfig.byNetwork.arbitrum.addresses.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      chainId: sdkConfig.networkNameToId.arbitrum,
      graphEndpoint: sdkConfig.byNetwork.arbitrum.theGraphEndpoint
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
      price
    };
  };

  private indexedToFxToken = (fxToken: IndexedFxToken): FxToken => {
    return {
      symbol: fxToken.symbol,
      address: fxToken.address,
      price: fxToken.rate
    };
  };
}
