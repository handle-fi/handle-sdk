import { ethers } from "ethers";
import { GraphQLClient, gql } from "graphql-request/dist";
import { CollateralSymbol } from "../../../types/collaterals";
import { buildFilter } from "../utils";

export type IndexedCollateral = {
  address: string;
  name: string;
  symbol: CollateralSymbol;
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

export default class FxTokenGraphClient {
  constructor(private client: GraphQLClient) {}

  public query = async (filter: any): Promise<IndexedCollateral[]> => {
    const data = await this.client.request<QueryResponse>(this.getQueryString(filter));
    const tokens = data?.collateralTokens;
    if (tokens == null) throw new Error("Could not read collateral tokens");

    return tokens.map((t) => ({
      ...t,
      symbol: t.symbol as CollateralSymbol,
      address: t.id,
      mintCollateralRatio: ethers.BigNumber.from(t.mintCollateralRatio),
      interestRate: ethers.BigNumber.from(t.interestRate),
      liquidationFee: ethers.BigNumber.from(t.liquidationFee),
      totalBalance: ethers.BigNumber.from(t.totalBalance),
      rate: ethers.BigNumber.from(t.rate)
    }));
  };

  private getQueryString = (filter: any) => gql`
  query {
    collateralTokens${buildFilter(filter)} {
      id
      name
      symbol
      mintCollateralRatio
      liquidationFee
      interestRate
      totalBalance
      isValid
      decimals
      rate
    }
  }
`;
}
