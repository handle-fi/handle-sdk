import { ethers } from "ethers";
import sdkConfig from "../config";
import { ProtocolAddresses } from "../config";
// import { GovernanceLock__factory } from "../contracts";
import { Promisified } from "../types/general";
import { GovernanceLockData } from "../types/governanceLock";
import { callMulticallObject, createMulticallProtocolContracts } from "../utils/contract-utils";

export type FxKeeperPoolConfig = {
  protocolAddresses: ProtocolAddresses;
  chainId: number;
};

type GovernanceLockMulticall = {
  supply: ethers.BigNumber;
  acountLocked?: {
    amount: ethers.BigNumber;
    end: ethers.BigNumber;
  };
  accountBalance?: ethers.BigNumber;
};

export default class GovernanceLock {
  private config: FxKeeperPoolConfig;

  constructor(c?: FxKeeperPoolConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      chainId: sdkConfig.networkNameToId.arbitrum
    };
  }

  public getData = async (
    account: string | undefined,
    signer: ethers.Signer
  ): Promise<GovernanceLockData> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicall = this.getMulticall(account, signer);
    return callMulticallObject(multicall, provider);
  };

  private getMulticall = (
    account: string | undefined,
    signer: ethers.Signer
  ): Promisified<GovernanceLockMulticall> => {
    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const base = {
      supply: contracts.governanceLock.supply()
    };

    if (account) {
      return {
        ...base,
        acountLocked: contracts.governanceLock.locked(account),
        accountBalance: contracts.governanceLock.balanceOf(account)
      };
    }

    return base;
  };
}
