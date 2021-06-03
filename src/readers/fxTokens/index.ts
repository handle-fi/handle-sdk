import query from "./query";
import { mainneGqltClient, kovanGqlClient } from "../graphqlClient";
import { ethers } from "ethers";

export type IndexedFxlTokenData = {
  address: string;
  name: string;
  symbol: string;
  rewardRatio: ethers.BigNumber;
  totalSupply: ethers.BigNumber;
  isValid: boolean;
};

/** Returns indexed vault data. */
export const readFxTokens = async (isKovan: boolean): Promise<IndexedFxlTokenData[]> => {
  const client = isKovan ? kovanGqlClient : mainneGqltClient;
  const data = await client.request(query);
  const tokens = data?.fxTokens;
  if (tokens == null) throw new Error("Could not read fxTokens");
  // Parse numbers.
  for (let token of tokens) {
    token.address = token.id;
    delete token.id;
    token.rewardRatio = ethers.BigNumber.from(token.rewardRatio);
    token.totalSupply = ethers.BigNumber.from(token.totalSupply);
  }
  return tokens;
};
