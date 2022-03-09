import { LPStakingPoolDetails } from "../config";
import sdkConfig from "../config";
import { LPStakingPool, LPStakingPoolName, LPStakingPoolNameMap } from "../types/lpStaking";
import { ethers, Signer } from "ethers";
import {
  callMulticallObjects,
  createERC20MulticallContract,
  createMultiCallContract
} from "../utils/contract-utils";
import { Promisified } from "../types/general";
import { Staking as StakingContract, Staking__factory } from "../contracts";
import stakingContractAbi from "../abis/handle/Staking.json";
import { Provider as MultiCallProvider } from "ethers-multicall";

export type LPStakingConfig = {
  pools: LPStakingPoolNameMap<LPStakingPoolDetails>;
  chainId: number;
};

export type LPStakingPoolMulticall = {
  totalDeposited: ethers.BigNumber;
  distributionRate: ethers.BigNumber;
  lpTokenTotalSupply: ethers.BigNumber;
  distributionPeriodEnds: ethers.BigNumber;
  deposited?: ethers.BigNumber;
  claimableRewards?: ethers.BigNumber;
};

export type StakeAndWithdrawArgs = {
  poolName: LPStakingPoolName;
  amount: ethers.BigNumber;
};

export default class LPStaking {
  public config: LPStakingConfig;

  constructor(c?: LPStakingConfig) {
    this.config = c || {
      pools: sdkConfig.lpStaking.arbitrum,
      chainId: sdkConfig.networkNameToId.arbitrum
    };
  }

  public getPools = async (
    account: string | undefined,
    signer: ethers.Signer
  ): Promise<LPStakingPool[]> => {
    const poolNames = Object.keys(this.config.pools) as LPStakingPoolName[];

    const multicalls = poolNames.map((poolName) => {
      return this.getMulticall(account, this.config.pools[poolName]);
    });

    const provider = new MultiCallProvider(signer.provider!, this.config.chainId);
    const multicallResponses = await callMulticallObjects(multicalls, provider);
    const tokenBalances = await this.getTokenDepositedIntoLP(signer);

    return multicallResponses.map((poolData, index) => {
      const poolName = poolNames[index];
      const balances = tokenBalances[index];
      const pool = this.config.pools[poolName];

      return {
        name: poolName,
        title: pool.title,
        platform: pool.platform,
        totalDeposited: poolData.totalDeposited,
        distributionRate: poolData.distributionRate,
        lpTokenTotalSupply: poolData.lpTokenTotalSupply,
        distributionPeriodEnds: poolData.distributionPeriodEnds,
        lpToken: pool.lpToken,
        tokensInLp: pool.tokensInLp.map((token) => ({
          symbol: token.symbol,
          address: token.address,
          decimals: token.decimals,
          balance: balances[token.symbol]
        })),
        url: pool.url,
        account:
          poolData.claimableRewards && poolData.deposited
            ? {
                claimableRewards: poolData.claimableRewards,
                deposited: poolData.deposited
              }
            : undefined
      };
    });
  };

  public stake(
    args: StakeAndWithdrawArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public stake(
    args: StakeAndWithdrawArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public stake(
    args: StakeAndWithdrawArgs,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(args.poolName, signer);
    const method = populateTransaction ? contract.populateTransaction.stake : contract.stake;
    return method(args.amount, options);
  }

  public unstake(
    args: StakeAndWithdrawArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public unstake(
    args: StakeAndWithdrawArgs,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public unstake(
    args: StakeAndWithdrawArgs,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(args.poolName, signer);
    const method = populateTransaction ? contract.populateTransaction.withdraw : contract.withdraw;
    return method(args.amount, options);
  }

  public claim(
    poolName: LPStakingPoolName,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public claim(
    poolName: LPStakingPoolName,
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public claim(
    poolName: LPStakingPoolName,
    signer: ethers.Signer,
    options: ethers.Overrides = {},
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const contract = this.getContract(poolName, signer);
    const method = populateTransaction
      ? contract.populateTransaction.getReward
      : contract.getReward;
    return method(options);
  }

  private getMulticall = (
    account: string | undefined,
    poolDetails: LPStakingPoolDetails
  ): Promisified<LPStakingPoolMulticall> => {
    const stakingContract = createMultiCallContract<StakingContract>(
      poolDetails.stakingContractAddress,
      stakingContractAbi
    );

    const lpToken = createERC20MulticallContract(poolDetails.lpToken.address);

    const base = {
      totalDeposited: lpToken.balanceOf(poolDetails.stakingContractAddress),
      lpTokenTotalSupply: lpToken.totalSupply(),
      distributionRate: stakingContract.rewardRate(),
      distributionPeriodEnds: stakingContract.periodFinish()
    };

    if (account) {
      return {
        ...base,
        deposited: stakingContract.balanceOf(account),
        claimableRewards: stakingContract.earned(account)
      };
    }

    return base;
  };

  private getTokenDepositedIntoLP = async (
    signer: ethers.Signer
  ): Promise<{ [key: string]: ethers.BigNumber }[]> => {
    const poolNames = Object.keys(this.config.pools) as LPStakingPoolName[];

    const multicalls = poolNames.map((poolName) => {
      const pool = this.config.pools[poolName];

      return pool.tokensInLp.reduce((progress, token) => {
        return {
          ...progress,
          [token.symbol]: createERC20MulticallContract(token.address).balanceOf(
            pool.lpToken.address
          )
        };
      }, {});
    });

    const provider = new MultiCallProvider(signer.provider!, this.config.chainId);

    return callMulticallObjects(multicalls, provider);
  };

  private getContract = (poolName: LPStakingPoolName, signer: Signer) => {
    return Staking__factory.connect(this.config.pools[poolName].stakingContractAddress, signer);
  };
}
