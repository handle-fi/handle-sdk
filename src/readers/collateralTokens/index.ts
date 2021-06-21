import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";

export type IndexedCollateralTokenData = {
  address: string;
  name: string;
  symbol: string;
  mintCollateralRatio: ethers.BigNumber;
  interestRate: ethers.BigNumber;
  liquidationFee: ethers.BigNumber;
  totalBalance: ethers.BigNumber;
  isValid: boolean;
};

/** Returns indexed vault data. */
export const readCollateralTokens = async (
  client: GraphQLClient
): Promise<IndexedCollateralTokenData[]> => {
  const data = await client.request(query);
  const tokens = data?.collateralTokens;
  if (tokens == null) throw new Error("Could not read collateral tokens");
  // Parse numbers.
  for (let token of tokens) {
    token.address = token.id;
    delete token.id;
    token.mintCollateralRatio = ethers.BigNumber.from(token.mintCollateralRatio);
    token.liquidationFee = ethers.BigNumber.from(token.liquidationFee);
    token.totalBalance = ethers.BigNumber.from(token.totalBalance);
    token.interestRate = ethers.BigNumber.from(token.interestRate);
  }
  return tokens;
};
