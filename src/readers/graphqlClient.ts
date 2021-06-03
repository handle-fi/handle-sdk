import { GraphQLClient } from "graphql-request/dist";

export const mainneGqltClient = new GraphQLClient(
  "https://api.thegraph.com/subgraphs/name/handle-fi/handle"
);
export const kovanGqlClient = new GraphQLClient(
  "https://api.thegraph.com/subgraphs/name/handle-fi/handle-kovan"
);
