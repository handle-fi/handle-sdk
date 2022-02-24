import { ethers, Signer } from "ethers";
import sdkConfig, { RewardPoolIds } from "../config";
import { ProtocolAddresses } from "../config";
import { RewardPool__factory } from "../contracts";
import { Promisified } from "../types/general";
import {
  RewardPoolData,
  RewardPoolName,
  RewardPoolDataPools,
  RewardPoolDataPool,
  RewardPoolPool,
  RewardPoolNameMap
} from "../types/rewardPool";
import { callMulticallObject, createMulticallProtocolContracts } from "../utils/contract-utils";

export type RewardsPoolConfig = {
  protocolAddresses: ProtocolAddresses;
  rewardPoolIds: RewardPoolIds;
  chainId: number;
};

type RewardsPoolDataMulticall = {
  pools: {
    poolRatios: ethers.BigNumber[];
    accruedAmounts: ethers.BigNumber[];
    deltaS: ethers.BigNumber[];
  };
  forexDistributionRate: ethers.BigNumber;
  accountBalance?: ethers.BigNumber;
};

type RewardsPoolsMulticall = RewardPoolNameMap<{
  weight: ethers.BigNumber;
  assetType: number;
  assetAddress: string;
  totalDeposits: ethers.BigNumber;
  S: ethers.BigNumber;
}>;

export default class RewardPool {
  private config: RewardsPoolConfig;

  constructor(c?: RewardsPoolConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      rewardPoolIds: sdkConfig.protocol.arbitrum.rewardPoolIds,
      chainId: sdkConfig.networkNameToId.arbitrum
    };
  }

  public getData = async (
    account: string | undefined,
    signer: ethers.Signer
  ): Promise<RewardPoolData> => {
    const { provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const multicall = this.getDataMulticall(account, signer);
    const multicallResponse = await callMulticallObject(multicall, provider);
    return this.toRewardPoolData(multicallResponse);
  };

  public getPool = async (poolName: RewardPoolName, signer: Signer): Promise<RewardPoolPool> => {
    const contract = this.getContract(signer);
    const poolId = this.config.rewardPoolIds[poolName];
    const pool = await contract.getPool(poolId);
    return {
      name: poolName,
      ...pool
    };
  };

  public getPools = async (signer: Signer): Promise<RewardPoolNameMap<RewardPoolPool>> => {
    const { contracts, provider } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const poolNames = Object.keys(this.config.rewardPoolIds) as RewardPoolName[];

    const multicall: Promisified<RewardsPoolsMulticall> = poolNames.reduce((progress, poolName) => {
      const poolId = this.config.rewardPoolIds[poolName];
      return {
        ...progress,
        [poolName]: contracts.rewardPool.getPool(poolId)
      };
    }, {} as Promisified<RewardsPoolsMulticall>);

    const multicallResponse = await callMulticallObject(multicall, provider);

    return poolNames.reduce((progress, poolName) => {
      const pool = multicallResponse[poolName];

      return {
        ...progress,
        [poolName]: {
          ...pool,
          name: poolName
        }
      };
    }, {} as RewardPoolNameMap<RewardPoolPool>);
  };

  private getDataMulticall = (
    account: string | undefined,
    signer: ethers.Signer
  ): Promisified<RewardsPoolDataMulticall> => {
    const { contracts } = createMulticallProtocolContracts(
      this.config.protocolAddresses,
      this.config.chainId,
      signer
    );

    const base = {
      forexDistributionRate: contracts.rewardPool.forexDistributionRate(),
      pools: contracts.rewardPool.getPoolsData()
    };

    if (account) {
      return {
        ...base,
        accountBalance: contracts.rewardPool.balanceOf(account)
      };
    }

    return base;
  };

  private toRewardPoolData = (multicallResponse: RewardsPoolDataMulticall): RewardPoolData => {
    const poolNames = Object.keys(this.config.rewardPoolIds) as RewardPoolName[];

    return {
      forexDistributionRate: multicallResponse.forexDistributionRate,
      accountBalance: multicallResponse.accountBalance,
      pools: poolNames.reduce((progress, pn) => {
        const poolName = pn as RewardPoolName;
        const poolId = this.config.rewardPoolIds[poolName];
        const rewardPool: RewardPoolDataPool = {
          ratio: multicallResponse.pools.poolRatios[poolId],
          deltaS: multicallResponse.pools.deltaS[poolId],
          accruedAmount: multicallResponse.pools.accruedAmounts[poolId]
        };

        return {
          ...progress,
          [poolName]: rewardPool
        };
      }, {} as RewardPoolDataPools)
    };
  };

  private getContract = (signer: ethers.Signer) => {
    return RewardPool__factory.connect(this.config.protocolAddresses.rewardPool, signer);
  };
}
