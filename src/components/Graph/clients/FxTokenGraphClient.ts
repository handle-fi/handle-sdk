import { ethers } from "ethers";
import { GraphQLClient, gql } from "graphql-request/dist";
import { FxTokenSymbol } from "../../..";
import { buildFilter } from "../utils";

export type IndexedFxToken = {
  address: string;
  name: string;
  symbol: FxTokenSymbol;
  totalSupply: ethers.BigNumber;
  rate: ethers.BigNumber;
  decimals: number;
  isValid: boolean;
};

type QueryResponse = {
  fxTokens: {
    id: string;
    name: string;
    symbol: FxTokenSymbol;
    totalSupply: string;
    rate: string;
    decimals: number;
    isValid: boolean;
  }[];
};

export default class FxTokenGraphClient {
  constructor(private client: GraphQLClient) {}

  public query = async (filter: any): Promise<IndexedFxToken[]> => {
    const data = await this.client.request<QueryResponse>(this.getQueryString(filter));
    const tokens = data?.fxTokens;
    if (tokens == null) throw new Error("Could not read fxTokens");

    return tokens.map((t) => ({
      ...t,
      address: t.id.toLowerCase(),
      totalSupply: ethers.BigNumber.from(t.totalSupply),
      rate: ethers.BigNumber.from(t.rate)
    }));
  };

  private getQueryString = (filter: any) => gql`
  query {
    fxTokens${buildFilter(filter)} {
      id
      name
      symbol
      totalSupply
      isValid
      decimals
      rate
    }
  }
`;
}
