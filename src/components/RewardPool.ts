import { ethers, Signer } from "ethers";
import sdkConfig, { FxTokenAddresses } from "../config";
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
  fxTokenAddresses: FxTokenAddresses;
  chainId: number;
};

type RewardsPoolDataMulticall = {
  pools: {
    poolRatios: ethers.BigNumber[];
    accruedAmounts: ethers.BigNumber[];
    deltaS: ethers.BigNumber[];
  };
  forexDistributionRate: ethers.BigNumber;
  claimableRewards?: ethers.BigNumber;
};

type RewardsPoolsMulticall = RewardPoolNameMap<{
  weight: ethers.BigNumber;
  assetType: number;
  assetAddress: string;
  totalDeposits: ethers.BigNumber;
  S: ethers.BigNumber;
}>;

type RewardPoolIdsMulticall = RewardPoolNameMap<{ found: boolean; poolId: ethers.BigNumber }>;

export default class RewardPool {
  private config: RewardsPoolConfig;
  private rewardPoolIds: RewardPoolNameMap<number> | undefined;

  constructor(c?: RewardsPoolConfig) {
    this.config = c || {
      protocolAddresses: sdkConfig.protocol.arbitrum.protocol,
      fxTokenAddresses: sdkConfig.fxTokenAddresses,
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

    const rewardPoolIds = await this.getRewardPoolsId(signer);

    const multicall = this.getDataMulticall(account, signer);
    const multicallResponse = await callMulticallObject(multicall, provider);
    return this.toRewardPoolData(multicallResponse, rewardPoolIds);
  };

  public getPool = async (poolName: RewardPoolName, signer: Signer): Promise<RewardPoolPool> => {
    const contract = this.getContract(signer);
    const rewardPoolIds = await this.getRewardPoolsId(signer);
    const poolId = rewardPoolIds[poolName];
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

    const rewardPoolIds = await this.getRewardPoolsId(signer);
    const poolNames = Object.keys(rewardPoolIds) as RewardPoolName[];

    const multicall: Promisified<RewardsPoolsMulticall> = poolNames.reduce((progress, poolName) => {
      const poolId = rewardPoolIds[poolName];
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

  public claim = (signer: ethers.Signer) => {
    const contract = this.getContract(signer);
    return contract.claim();
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
        claimableRewards: contracts.rewardPool.balanceOf(account)
      };
    }

    return base;
  };

  private toRewardPoolData = (
    multicallResponse: RewardsPoolDataMulticall,
    poolIds: RewardPoolNameMap<number>
  ): RewardPoolData => {
    const poolNames = Object.keys(poolIds) as RewardPoolName[];

    return {
      forexDistributionRate: multicallResponse.forexDistributionRate,
      account: multicallResponse.claimableRewards
        ? {
            claimableRewards: multicallResponse.claimableRewards
          }
        : undefined,
      pools: poolNames.reduce((progress, pn) => {
        const poolName = pn as RewardPoolName;
        const poolId = poolIds[poolName];
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

  private getRewardPoolsId = async (signer: ethers.Signer): Promise<RewardPoolNameMap<number>> => {
    if (!this.rewardPoolIds) {
      const { contracts, provider } = createMulticallProtocolContracts(
        this.config.protocolAddresses,
        this.config.chainId,
        signer
      );

      const multicall: Promisified<RewardPoolIdsMulticall> = {
        governanceLock: contracts.rewardPool.getPoolIdByAlias(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("governancelock"))
        ),
        fxKeeperAUD: contracts.rewardPool.getPoolIdByAlias(
          this.getKeeperPoolAlias(this.config.fxTokenAddresses["fxAUD"])
        ),
        fxKeeperEUR: contracts.rewardPool.getPoolIdByAlias(
          this.getKeeperPoolAlias(this.config.fxTokenAddresses["fxEUR"])
        ),
        fxKeeperPHP: contracts.rewardPool.getPoolIdByAlias(
          this.getKeeperPoolAlias(this.config.fxTokenAddresses["fxPHP"])
        ),
        fxKeeperUSD: contracts.rewardPool.getPoolIdByAlias(
          this.getKeeperPoolAlias(this.config.fxTokenAddresses["fxUSD"])
        )
      };

      const multicallResponse = await callMulticallObject(multicall, provider);

      this.rewardPoolIds = Object.keys(multicallResponse).reduce((progress, pn) => {
        const poolName = pn as RewardPoolName;
        return {
          ...progress,
          [poolName]: multicallResponse[poolName].poolId
        };
      }, {} as RewardPoolNameMap<number>);
    }
    return this.rewardPoolIds;
  };

  private getContract = (signer: ethers.Signer) => {
    return RewardPool__factory.connect(this.config.protocolAddresses.rewardPool, signer);
  };

  private getKeeperPoolAlias = (fxTokenAddress: string) =>
    ethers.utils.keccak256(ethers.utils.solidityPack(["address", "uint256"], [fxTokenAddress, 2]));
}
