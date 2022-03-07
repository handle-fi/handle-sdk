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

type CreateLockArgs = {
  durationInSeconds: number;
  forexAmount: ethers.BigNumber;
};

type IncreaseLockDurationByArgs = {
  increaseDurationByInSeconds: number;
  currentUnlocksAt: ethers.BigNumber;
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

  public createLock(
    args: CreateLockArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public createLock(
    args: CreateLockArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public createLock(
    args: CreateLockArgs,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    if (args.durationInSeconds > MAX_LOCK_SECONDS) {
      throw new Error(`Duration cannot be greater than ${MAX_LOCK_SECONDS} seconds`);
    }

    const unlockDate = Math.floor(Date.now() / 1000 + args.durationInSeconds);
    const contract = this.getContract(signer);
    const method = populateTransaction
      ? contract.populateTransaction.createLock
      : contract.createLock;
    return method(args.forexAmount, unlockDate, options);
  }

  public increaseLockedAmount(
    forexAmount: ethers.BigNumber,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public increaseLockedAmount(
    forexAmount: ethers.BigNumber,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public increaseLockedAmount(
    forexAmount: ethers.BigNumber,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(signer);
    const method = populateTransaction
      ? contract.populateTransaction.increaseAmount
      : contract.increaseAmount;
    return method(forexAmount, options);
  }

  public increaseLockDurationBy(
    args: IncreaseLockDurationByArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public increaseLockDurationBy(
    args: IncreaseLockDurationByArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public increaseLockDurationBy(
    args: IncreaseLockDurationByArgs,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(signer);

    const newUnlocksAt = Math.floor(
      args.currentUnlocksAt.toNumber() + args.increaseDurationByInSeconds
    );

    const now = Date.now() / 1000;

    if (newUnlocksAt - now > MAX_LOCK_SECONDS) {
      throw new Error(`Duration cannot be greater than ${MAX_LOCK_SECONDS} seconds`);
    }

    const method = populateTransaction
      ? contract.populateTransaction.increaseUnlockTime
      : contract.increaseUnlockTime;
    return method(newUnlocksAt, options);
  }

  public withdraw(
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public withdraw(
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public withdraw(
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(signer);
    return populateTransaction
      ? contract.populateTransaction.withdraw(options)
      : contract.withdraw(options);
  }

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
