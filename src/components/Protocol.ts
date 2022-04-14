import { ethers } from "ethers";
import { ProtocolAddresses } from "../config";
import sdkConfig from "../config";
import { callMulticallObject, createMulticallProtocolContracts } from "../utils/contract-utils";
import { Promisified } from "../types/general";
import { Token } from "../types/tokens";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";

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
  public forexToken: Token<"FOREX">;

  constructor(c?: ProtocolConfig) {
    this.config = c || {
      forexTokenAddress: sdkConfig.forexAddress,
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      chainId: NETWORK_NAME_TO_CHAIN_ID.arbitrum
    };

    this.forexToken = {
      symbol: "FOREX",
      address: this.config.forexTokenAddress,
      decimals: 18
    };
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

