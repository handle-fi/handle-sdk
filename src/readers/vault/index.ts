import query from "./query";
import { mainnetGqlClient, kovanGqlClient } from "../graphqlClient";
import { ethers } from "ethers";

export type IndexedVaultData = {
  debt: ethers.BigNumber;
  collateralTokens: { address: string; amount: ethers.BigNumber }[];
};

/** Returns indexed vault data. */
export const readIndexedVaultData = async (
  account: string,
  fxToken: string,
  isKovan: boolean
): Promise<IndexedVaultData> => {
  account = account.toLowerCase();
  fxToken = fxToken.toLowerCase();
  const client = isKovan ? kovanGqlClient : mainnetGqlClient;
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
