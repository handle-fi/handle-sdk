import { ethers } from "ethers";
import { ProtocolAddresses } from "../config";
import sdkConfig from "../config";
import { callMulticallObject, createMulticallProtocolContracts } from "../utils/contract-utils";
import { Promisified } from "../types/general";

export type ProtocolConfig = {
  protocolAddresses: ProtocolAddresses;
  chainId: number;
};

export type ProtocolParameters = {
  mint: ethers.BigNumber;
  burn: ethers.BigNumber;
  withdraw: ethers.BigNumber;
  deposit: ethers.BigNumber;
  minimumMintingAmountAsEth: ethers.BigNumber;
};

export default class Vaults {
  private config: ProtocolConfig;

  constructor(c?: ProtocolConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.byNetwork.arbitrum.addresses.protocol,
      chainId: sdkConfig.networkNameToId.arbitrum
    };
  }

  public getProtocolParameters = async (signer: ethers.Signer): Promise<ProtocolParameters> => {
    const { provider, contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicall: Promisified<ProtocolParameters> = {
      mint: contracts.handle.mintFeePerMille(),
      burn: contracts.handle.burnFeePerMille(),
      withdraw: contracts.handle.withdrawFeePerMille(),
      deposit: contracts.handle.depositFeePerMille(),
      minimumMintingAmountAsEth: contracts.comptroller.minimumMintingAmount()
    };

    return callMulticallObject(multicall, provider);
  };
}
