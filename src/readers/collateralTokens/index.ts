import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";
import { buildFilter } from "../utils";

export type IndexedCollateralTokenData = {
  address: string;
  name: string;
  symbol: string;
  mintCollateralRatio: ethers.BigNumber;
  interestRate: ethers.BigNumber;
  liquidationFee: ethers.BigNumber;
  totalBalance: ethers.BigNumber;
  rate: ethers.BigNumber;
  decimals: number;
  isValid: boolean;
};

type QueryResponse = {
  collateralTokens: {
    id: string;
    name: string;
    symbol: string;
    mintCollateralRatio: string;
    interestRate: string;
    liquidationFee: string;
    totalBalance: string;
    rate: string;
    decimals: number;
    isValid: boolean;
  }[];
};

/** Returns indexed vault data. */
export const queryCollateralTokens = async (
  client: GraphQLClient,
  filter?: any
): Promise<IndexedCollateralTokenData[]> => {
  const data = await client.request<QueryResponse>(query(buildFilter(filter)));
  const tokens = data?.collateralTokens;
  if (tokens == null) throw new Error("Could not read collateral tokens");

  return tokens.map((t) => ({
    ...t,
    address: t.id,
    mintCollateralRatio: ethers.BigNumber.from(t.mintCollateralRatio),
    interestRate: ethers.BigNumber.from(t.interestRate),
    liquidationFee: ethers.BigNumber.from(t.liquidationFee),
    totalBalance: ethers.BigNumber.from(t.totalBalance),
    rate: ethers.BigNumber.from(t.rate)
  }));
};
