import query from "./query";
import { GraphQLClient } from "graphql-request/dist";

export type IndexedVaultRegistry = {
  fxToken: string;
  owners: string[];
}[];

/** Returns indexed vault registry data. */
export const readVaultRegistry = async (client: GraphQLClient): Promise<IndexedVaultRegistry> => {
  const data = await client.request(query);
  if (!Array.isArray(data?.vaultRegistries)) throw new Error("Could not read VaultRegistry");
  return data.vaultRegistries.map((registry: any) => ({
    fxToken: registry.id,
    ...registry
  }));
};
