import { GraphQLClient } from "graphql-request/dist";

let gqlClient: GraphQLClient;

/**
 * Returns the default GraphQL endpoint URL for the given network.
 * @param network The network to fetch the GraphQL URL for.
 */
export const getUrlByNetworkName = (network: string) => {
  network = network.toLowerCase();
  return {
    kovan: "",
    homestead: "https://api.thegraph.com/subgraphs/name/handle-fi/handle-kovan",
    unknown: ""
  }[network];
};

export const configureClient = (url: string) => {
  gqlClient = new GraphQLClient(url);
};

export const getClient = () => gqlClient;

export const mainnetGqlClient = new GraphQLClient("");
export const kovanGqlClient = new GraphQLClient("");
