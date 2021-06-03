import query from "./query";
import { mainneGqltClient, kovanGqlClient } from "../graphqlClient";
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
): Promise<IndexedVaultData | null> => {
  account = account.toLowerCase();
  fxToken = fxToken.toLowerCase();
  const client = isKovan ? kovanGqlClient : mainneGqltClient;
  const data = await client.request(query, { account, fxToken });
  const vault = data?.vaults?.[0];
  if (vault == null) return null;
  // Parse vault numbers.
  vault.debt = ethers.BigNumber.from(vault.debt);
  for (let collateralToken of vault.collateralTokens) {
    collateralToken.amount = ethers.BigNumber.from(collateralToken.amount);
  }
  return vault;
};
