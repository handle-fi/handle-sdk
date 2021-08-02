import query from "./query";
import { GraphQLClient } from "graphql-request/dist";

export type IndexedTokenRegsitry = {
  fxTokens: string[];
  collateralTokens: string[];
};

/** Returns indexed vault data. */
export const readTokenRegistry = async (
  client: GraphQLClient,
  handleAddress: string
): Promise<IndexedTokenRegsitry> => {
  handleAddress = handleAddress.toLowerCase();
  const data = await client.request(query,{ handleAddress });
  if (data?.tokenRegistry == null)
    throw new Error("Could not read TokenRegistry");
  return data.tokenRegistry;
};
