import { ethers } from "ethers";
import { FxTokenSymbol } from "..";
import sdkConfig, { FxTokenAddresses } from "../config";
import { ProtocolAddresses } from "../config";
import { FxKeeperPool__factory } from "../contracts";
import { FxKeeperPoolPool } from "../types/fxKeeperPool";
// import { FxKeeperPool__factory } from "../contracts";
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

type StakeArgs = {
  amount: ethers.BigNumber;
  fxTokenSymbol: FxTokenSymbol;
};

export default class FxKeeperPool {
  public config: FxKeeperPoolConfig;

  constructor(c?: FxKeeperPoolConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
      chainId: sdkConfig.networkNameToId.arbitrum
    };
  }

  public getPool = async (
    account: string | undefined,
    fxTokenSymbol: FxTokenSymbol,
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

    const fxTokenSymbols = Object.keys(this.config.fxTokenAddresses) as FxTokenSymbol[];
    const multicalls = fxTokenSymbols.map((fx) =>
      this.getFxKeeperPoolMulticall(account, fx, signer)
    );
    const multicallResponses = await callMulticallObjects(multicalls, provider);
    return multicallResponses.map((r, index) => this.toFxKeeperPoolPool(fxTokenSymbols[index], r));
  };

  public stake(
    args: StakeArgs,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public stake(
    args: StakeArgs,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public stake(
    args: StakeArgs,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(signer);
    const method = populateTransaction ? contract.populateTransaction.stake : contract.stake;
    return method(args.amount, args.fxTokenSymbol, ethers.constants.AddressZero, options);
  }

  public unstake(
    args: StakeArgs,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public unstake(
    args: StakeArgs,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public unstake(
    args: StakeArgs,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(signer);
    const method = populateTransaction ? contract.populateTransaction.unstake : contract.unstake;
    return method(args.amount, args.fxTokenSymbol, options);
  }

  private getFxKeeperPoolMulticall = (
    account: string | undefined,
    fxTokenSymbol: FxTokenSymbol,
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
    fxTokenSymbol: FxTokenSymbol,
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
