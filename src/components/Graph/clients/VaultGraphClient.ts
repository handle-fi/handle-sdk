import { GraphQLClient, gql } from "graphql-request/dist";
import { buildFilter } from "../utils";
import FxTokenGraphClient from "./FxTokenGraphClient";

export type IndexedVault = {
  account: string;
  debt: string;
  fxToken: string;
  collateralTokens: {
    address: string;
    amount: string;
  }[];
  redeemableTokens: string;
  collateralAsEther: string;
  collateralRatio: string;
  minimumRatio: string;
  isRedeemable: boolean;
  isLiquidatable: boolean;
};

type QueryResponse = {
  vaults: IndexedVault[];
};

export default class VaultGraphClient {
  constructor(private client: GraphQLClient, private fxTokenGraphClient: FxTokenGraphClient) {}

  public queryOne = async (filter: any): Promise<IndexedVault> => {
    const response = await this.query({ ...filter, first: 1 });
    return response[0];
  };

  public query = async (filter: any): Promise<IndexedVault[]> => {
    const data = await this.client.request<QueryResponse>(this.getQueryString(filter));
    // If the array is not present, there was an error in the request.
    if (!Array.isArray(data?.vaults)) throw new Error("Could not load indexed vault data");

    return data.vaults;
  };

  public withLowestCRForEachFxToken = async (): Promise<IndexedVault[]> => {
    const tokens = await this.fxTokenGraphClient.query({});

    const result = await Promise.all(
      tokens.map(async (token) =>
        this.queryOne({
          first: 1,
          where: { fxToken: token.address },
          orderBy: "collateralRatio",
          orderDirection: "asc"
        })
      )
    );

    return result.filter((r) => !!r);
  };

  private getQueryString = (filter: any) => gql`
  query {
    vaults${buildFilter(filter)} {
      account
      debt
      fxToken
      collateralTokens {
        address
        amount
      }
      redeemableTokens
      collateralAsEther
      collateralRatio
      minimumRatio
      isRedeemable
      isLiquidatable
    }
  }
`;
}
