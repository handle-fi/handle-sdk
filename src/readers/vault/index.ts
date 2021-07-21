import query from "./query";
import { ethers } from "ethers";
import { GraphQLClient } from "graphql-request/dist";
import { fxTokens } from "../../types/ProtocolTokens";

export type IndexedVaultData = {
  debt: ethers.BigNumber;
  fxToken: fxTokens;
  account: string;
  collateralTokens: { address: string; amount: ethers.BigNumber }[];
};

type QueryResponse = {
  vaults: {
    account: string;
    debt: string;
    fxToken: string;
    collateralTokens: {
      address: string;
      amount: string;
    }[];
  }[];
};

type Args = {
  account: string;
  fxToken: string;
};

export const getVault = async (client: GraphQLClient, args: Args): Promise<IndexedVaultData> => {
  const data = await queryVaults(client, args);
  return data[0];
};

export const queryVaults = async (
  client: GraphQLClient,
  whereArgs: Partial<Args>
): Promise<IndexedVaultData[]> => {
  const filter = buildFilter({
    account: whereArgs.account?.toLowerCase(),
    fxToken: whereArgs.fxToken?.toLowerCase()
  });

  const data = await client.request<QueryResponse>(query(filter));
  // If the array is not present, there was an error in the request.
  if (!Array.isArray(data?.vaults)) throw new Error("Could not load indexed vault data");

  return data.vaults.map((vault) => ({
    debt: ethers.BigNumber.from(vault.debt),
    account: vault.account,
    fxToken: vault.fxToken as fxTokens, //  todo - map from token address to token type
    collateralTokens: vault.collateralTokens.map((ct) => ({
      ...ct,
      amount: ethers.BigNumber.from(ct.amount)
    }))
  }));
};

// there below assumes all values are strings
const buildFilter = (whereArgs: any) => {
  const keys = Object.keys(whereArgs).filter((k) => whereArgs[k]);

  return `where: { ${keys.map((k) => `${k}: "${whereArgs[k]}"`)} }`;
};
