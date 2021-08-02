import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";
import { buildFilter } from "../utils";

export type IndexedFxPoolData = {
  address: string;
  fxToken: string;
  totalDeposits: ethers.BigNumber;
  depositorCount: ethers.BigNumber;
  liquidationsExecuted: ethers.BigNumber;
  collateralTokens: { address: string; amount: ethers.BigNumber }[];
  collateralAddresses: string[];
};

type QueryResponse = {
  fxKeeperPools: {
    id: string;
    fxToken: string;
    totalDeposits: string;
    depositorCount: string;
    liquidationsExecuted: string;
    collateralTokens: { address: string; amount: string }[];
    collateralAddresses: string[];
  }[];
};

export const queryFxKeeperPools = async (
  client: GraphQLClient,
  filter: any
): Promise<IndexedFxPoolData[]> => {
  const data = await client.request<QueryResponse>(query(buildFilter(filter)));
  // If the array is not present, there was an error in the request.
  if (!Array.isArray(data?.fxKeeperPools)) throw new Error("Could not load indexed pool data");

  return data.fxKeeperPools.map((pool) => ({
    ...pool,
    address: pool.id,
    totalDeposits: ethers.BigNumber.from(pool.totalDeposits),
    depositorCount: ethers.BigNumber.from(pool.depositorCount),
    liquidationsExecuted: ethers.BigNumber.from(pool.liquidationsExecuted),
    collateralTokens: pool.collateralTokens.map((ct) => ({
      address: ct.address,
      amount: ethers.BigNumber.from(ct.amount)
    }))
  }));
};
