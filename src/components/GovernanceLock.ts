import { ethers } from "ethers";
import sdkConfig from "../config";
import { ProtocolAddresses } from "../config";
import { GovernanceLock__factory } from "../contracts";
import { Promisified } from "../types/general";
import { GovernanceLockData } from "../types/governanceLock";
import { callMulticallObject, createMulticallProtocolContracts } from "../utils/contract-utils";

export type FxKeeperPoolConfig = {
  forexAddress: string;
  protocolAddresses: ProtocolAddresses;
  chainId: number;
};

type GovernanceLockMulticall = {
  totalForexLocked: ethers.BigNumber;
  acountLocked?: {
    amount: ethers.BigNumber;
    end: ethers.BigNumber;
  };
  accountBalance?: ethers.BigNumber;
};

const MAX_LOCK_SECONDS = 4 * 365 * 24 * 60 * 60;

export default class GovernanceLock {
  public config: FxKeeperPoolConfig;

  constructor(c?: FxKeeperPoolConfig) {
    this.config = c || {
      forexAddress: sdkConfig.forexAddress,
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
    const response = await callMulticallObject(multicall, provider);

    return {
      totalForexLocked: response.totalForexLocked,
      account:
        response.acountLocked?.amount && response.acountLocked?.end && response.accountBalance
          ? {
              forexLocked: response.acountLocked?.amount,
              unlocksAt: response.acountLocked?.end,
              veForexBalance: response.accountBalance
            }
          : undefined
    };
  };

  public createLock = async (
    {
      forexAmount,
      durationInSeconds
    }: {
      durationInSeconds: number;
      forexAmount: ethers.BigNumber;
    },
    signer: ethers.Signer
  ) => {
    if (durationInSeconds > MAX_LOCK_SECONDS) {
      throw new Error(`Duration cannot be greater than ${MAX_LOCK_SECONDS} seconds`);
    }

    const unlockDate = Math.floor(Date.now() / 1000 + durationInSeconds);
    const contract = this.getContract(signer);
    return contract.createLock(forexAmount, unlockDate);
  };

  public increaseLockedAmount = async (forexAmount: ethers.BigNumber, signer: ethers.Signer) => {
    const contract = this.getContract(signer);
    return contract.increaseAmount(forexAmount);
  };

  public increaseLockDurationBy = async (
    {
      increaseDurationByInSeconds,
      currentUnlocksAt
    }: {
      increaseDurationByInSeconds: number;
      currentUnlocksAt: ethers.BigNumber;
    },
    signer: ethers.Signer
  ) => {
    const contract = this.getContract(signer);

    const newUnlocksAt = Math.floor(currentUnlocksAt.toNumber() + increaseDurationByInSeconds);

    const now = Date.now() / 1000;

    if (newUnlocksAt - now > MAX_LOCK_SECONDS) {
      throw new Error(`Duration cannot be greater than ${MAX_LOCK_SECONDS} seconds`);
    }

    return contract.increaseUnlockTime(newUnlocksAt);
  };

  public withdraw = (signer: ethers.Signer) => {
    const contract = this.getContract(signer);
    return contract.withdraw();
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
      totalForexLocked: contracts.governanceLock.supply()
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

  private getContract = (signer: ethers.Signer) => {
    return GovernanceLock__factory.connect(this.config.protocolAddresses.governanceLock, signer);
  };
}
