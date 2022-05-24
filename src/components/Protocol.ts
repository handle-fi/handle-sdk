import { ethers } from "ethers";
import { ProtocolAddresses } from "../config";
import sdkConfig from "../config";
import { callMulticallObject, createMulticallProtocolContracts } from "../utils/contract-utils";
import { Promisified } from "../types/general";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";
import { TokenInfo } from "@uniswap/token-lists";
import HandleTokenManager from "./TokenManager/HandleTokenManager";
import { mustExist } from "../utils/general-utils";

export type ProtocolConfig = {
  forexTokenAddress: string;
  protocolAddresses: ProtocolAddresses;
  chainId: number;
};

export type ProtocolParameters = {
  mintFee: ethers.BigNumber;
  burnFee: ethers.BigNumber;
  withdrawFee: ethers.BigNumber;
  depositFee: ethers.BigNumber;
  minimumMintingAmountAsEth: ethers.BigNumber;
};

export default class Vaults {
  private config: ProtocolConfig;
  public forexToken: TokenInfo & { symbol: "FOREX" };

  constructor(c?: ProtocolConfig) {
    this.config = c || {
      forexTokenAddress: sdkConfig.forexAddress,
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      chainId: NETWORK_NAME_TO_CHAIN_ID.arbitrum
    };

    // Protocol on arbitrum
    this.forexToken = mustExist(
      new HandleTokenManager([]).getTokenBySymbol("FOREX", "arbitrum"),
      "Forex on arbitrum"
    );
  }

  public getProtocolParameters = async (signer: ethers.Signer): Promise<ProtocolParameters> => {
    const { provider, contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicall: Promisified<ProtocolParameters> = {
      mintFee: contracts.handle.mintFeePerMille(),
      burnFee: contracts.handle.burnFeePerMille(),
      withdrawFee: contracts.handle.withdrawFeePerMille(),
      depositFee: contracts.handle.depositFeePerMille(),
      minimumMintingAmountAsEth: contracts.comptroller.minimumMintingAmount()
    };

    return callMulticallObject(multicall, provider);
  };
}
