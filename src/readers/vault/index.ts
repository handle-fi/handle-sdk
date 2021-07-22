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

export const queryVault = async (client: GraphQLClient, filter: any): Promise<IndexedVaultData> => {
  const response = await queryVaults(client, { ...filter, first: 1 });
  return response[0];
};

export const queryVaults = async (
  client: GraphQLClient,
  filter: any
): Promise<IndexedVaultData[]> => {
  const data = await client.request<QueryResponse>(query(buildFilter(filter)));
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

const buildFilter = (value: any, depth = 0): string => {
  const type = typeof value;

  if (type === "string") {
    return `"${value}"`;
  }

  if (type === "object") {
    const propertiesAndValues = Object.keys(value).map(
      (k) => `${k}: ${buildFilter(value[k], depth + 1)}`
    );

    if (depth === 0) {
      return `${propertiesAndValues}`;
    }

    return `{ ${propertiesAndValues} }`;
  }

  return value;
};
