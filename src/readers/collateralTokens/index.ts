import query from "./query";
import { mainneGqltClient, kovanGqlClient } from "../graphqlClient";
import { ethers } from "ethers";

export type IndexedCollateralTokenData = {
  name: string;
  symbol: string;
  mintCollateralRatio: ethers.BigNumber;
  liquidationFee: ethers.BigNumber;
  totalBalance: ethers.BigNumber;
  isValid: boolean;
};

/** Returns indexed vault data. */
export const readCollateralTokens = async (
  isKovan: boolean
): Promise<IndexedCollateralTokenData[]> => {
  const client = isKovan ? kovanGqlClient : mainneGqltClient;
  const data = await client.request(query);
  const tokens = data?.collateralTokens;
  if (tokens == null) throw new Error("Could not read collateral tokens");
  // Parse numbers.
  for (let token of tokens) {
    token.mintCollateralRatio = ethers.BigNumber.from(token.mintCollateralRatio);
    token.liquidationFee = ethers.BigNumber.from(token.liquidationFee);
    token.totalBalance = ethers.BigNumber.from(token.totalBalance);
  }
  return tokens;
};
