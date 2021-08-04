import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";
import { buildFilter } from "../utils";

export type IndexedFxlTokenData = {
  address: string;
  name: string;
  symbol: string;
  totalSupply: ethers.BigNumber;
  rate: ethers.BigNumber;
  decimals: number;
  isValid: boolean;
};

type QueryResponse = {
  fxTokens: {
    id: string;
    name: string;
    symbol: string;
    totalSupply: string;
    rate: string;
    decimals: number;
    isValid: boolean;
  }[];
};

/** Returns indexed vault data. */
export const queryFxTokens = async (
  client: GraphQLClient,
  filter: any
): Promise<IndexedFxlTokenData[]> => {
  const data = await client.request<QueryResponse>(query(buildFilter(filter)));
  const tokens = data?.fxTokens;
  if (tokens == null) throw new Error("Could not read fxTokens");

  return tokens.map((t) => ({
    ...t,
    address: t.id.toLowerCase(),
    totalSupply: ethers.BigNumber.from(t.totalSupply),
    rate: ethers.BigNumber.from(t.rate)
  }));
};
