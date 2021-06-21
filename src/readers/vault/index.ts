import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";

export type IndexedVaultData = {
  debt: ethers.BigNumber;
  collateralTokens: { address: string; amount: ethers.BigNumber }[];
};

/** Returns indexed vault data. */
export const readIndexedVaultData = async (
  client: GraphQLClient,
  account: string,
  fxToken: string
): Promise<IndexedVaultData> => {
  account = account.toLowerCase();
  fxToken = fxToken.toLowerCase();
  const data = await client.request(query, { account, fxToken });
  // If the array is not present, there was an error in the request.
  if (!Array.isArray(data?.vaults)) throw new Error("Could not load indexed vault data");
  const vault = data?.vaults[0];
  if (vault == null)
    return {
      debt: ethers.BigNumber.from(0),
      collateralTokens: []
    };
  // Parse vault numbers.
  vault.debt = ethers.BigNumber.from(vault.debt);
  for (let collateralToken of vault.collateralTokens) {
    collateralToken.amount = ethers.BigNumber.from(collateralToken.amount);
  }
  return vault;
};
