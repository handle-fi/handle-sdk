import { ethers } from "ethers";
import { GraphQLClient, gql } from "graphql-request/dist";
import { buildFilter } from "../utils";

export type IndexedFxKeeperPool = {
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

export default class FxKeeperPoolGraphClient {
  constructor(private client: GraphQLClient) {}

  public query = async (filter: any): Promise<IndexedFxKeeperPool[]> => {
    const data = await this.client.request<QueryResponse>(this.getQueryString(filter));
    const pools = data?.fxKeeperPools;
    if (pools == null) throw new Error("Could not read fxTokens");

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

  private getQueryString = (filter: any) => gql`
  query {
    fxKeeperPools${buildFilter(filter)} {
      id
      fxToken
      totalDeposits
      depositorCount
      liquidationsExecuted
      collateralTokens {
        address
        amount
      }
      collateralAddresses
    }
  }
`;
}
