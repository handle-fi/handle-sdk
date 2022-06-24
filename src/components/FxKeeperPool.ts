import { ethers } from "ethers";
import sdkConfig, { FxTokenAddresses } from "../config";
import { ProtocolAddresses } from "../config";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";
import { FxKeeperPool__factory } from "../contracts";
import { FxKeeperPoolPool } from "../types/fxKeeperPool";
import { Promisified } from "../types/general";
import {
  callMulticallObject,
  callMulticallObjects,
  createMulticallProtocolContracts
} from "../utils/contract-utils";

export type FxKeeperPoolConfig = {
  protocolAddresses: ProtocolAddresses;
  fxTokenAddresses: FxTokenAddresses;
  chainId: number;
};

type KeeperPoolMulticall = {
  totalDeposited: ethers.BigNumber;
  accountBalance?: ethers.BigNumber;
  accountRewards?: { collateralTypes: string[]; collateralAmounts: ethers.BigNumber[] };
};

type FxTokenArg = {
  fxTokenSymbol: string;
}

type StakeArgs = FxTokenArg & {
  amount: ethers.BigNumber;
};

export default class FxKeeperPool {
  public config: FxKeeperPoolConfig;

  constructor(c?: FxKeeperPoolConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      chainId: NETWORK_NAME_TO_CHAIN_ID.arbitrum
    };
  }

  public getPool = async (
    account: string | undefined,
    fxTokenSymbol: string,
    signer: ethers.Signer
  ): Promise<FxKeeperPoolPool> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicall = this.getFxKeeperPoolMulticall(account, fxTokenSymbol, signer);
    const multicallResponse = await callMulticallObject(multicall, provider);
    return this.toFxKeeperPoolPool(fxTokenSymbol, multicallResponse);
  };

  public getPools = async (
    account: string | undefined,
    signer: ethers.Signer
  ): Promise<FxKeeperPoolPool[]> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const fxTokenSymbols = Object.keys(this.config.fxTokenAddresses);
    const multicalls = fxTokenSymbols.map((fx) =>
      this.getFxKeeperPoolMulticall(account, fx, signer)
    );
    const multicallResponses = await callMulticallObjects(multicalls, provider);
    return multicallResponses.map((r, index) => this.toFxKeeperPoolPool(fxTokenSymbols[index], r));
  };

  public stake = (
    args: StakeArgs,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    const contract = this.getContract(signer);
    const fxTokenAddress = this.config.fxTokenAddresses[args.fxTokenSymbol];
    return contract.stake(args.amount, fxTokenAddress, ethers.constants.AddressZero, options);
  };

  public unstake = (
    args: StakeArgs,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    const contract = this.getContract(signer);
    const fxTokenAddress = this.config.fxTokenAddresses[args.fxTokenSymbol];
    return contract.unstake(args.amount, fxTokenAddress, options);
  };
  
  public claim = (
    args: FxTokenArg,
    signer: ethers.Signer,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction> => {
    const contract = this.getContract(signer);
    const fxTokenAddress = this.config.fxTokenAddresses[args.fxTokenSymbol];
    return contract.withdrawCollateralReward(fxTokenAddress, options);
  };

  private getFxKeeperPoolMulticall = (
    account: string | undefined,
    fxTokenSymbol: string,
    signer: ethers.Signer
  ): Promisified<KeeperPoolMulticall> => {
    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const base = {
      totalDeposited: contracts.fxKeeperPool.getPoolTotalDeposit(
        this.config.fxTokenAddresses[fxTokenSymbol]
      )
    };

    if (account) {
      return {
        ...base,
        accountBalance: contracts.fxKeeperPool.balanceOfStake(
          account,
          this.config.fxTokenAddresses[fxTokenSymbol]
        ),
        accountRewards: contracts.fxKeeperPool.balanceOfRewards(
          account,
          this.config.fxTokenAddresses[fxTokenSymbol]
        )
      };
    }

    return base;
  };

  private toFxKeeperPoolPool = (
    fxTokenSymbol: string,
    multicallResponse: KeeperPoolMulticall
  ): FxKeeperPoolPool => {
    return {
      fxToken: fxTokenSymbol,
      totalDeposited: multicallResponse.totalDeposited,
      account:
        multicallResponse.accountBalance && multicallResponse.accountRewards
          ? {
              fxLocked: multicallResponse.accountBalance,
              rewards: multicallResponse.accountRewards
            }
          : undefined
    };
  };

  private getContract = (signer: ethers.Signer) => {
    return FxKeeperPool__factory.connect(this.config.protocolAddresses.fxKeeperPool, signer);
  };
}
