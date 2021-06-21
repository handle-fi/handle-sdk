import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";

export type IndexedFxlTokenData = {
  address: string;
  name: string;
  symbol: string;
  totalSupply: ethers.BigNumber;
  isValid: boolean;
};

/** Returns indexed vault data. */
export const readFxTokens = async (client: GraphQLClient): Promise<IndexedFxlTokenData[]> => {
  const data = await client.request(query);
  const tokens = data?.fxTokens;
  if (tokens == null) throw new Error("Could not read fxTokens");
  // Parse numbers.
  for (let token of tokens) {
    token.address = token.id;
    delete token.id;
    token.totalSupply = ethers.BigNumber.from(token.totalSupply);
  }
  return tokens;
};
