import config from "../config.json";
import { GraphQLClient } from "graphql-request/dist";

export const getKovanGqlClient = () => {
  const kovanConfig = config.networks.find((x) => x.name === "kovan");
  if (kovanConfig == null) throw new Error("Could not fetch config object for Kovan");
  return new GraphQLClient(kovanConfig.theGraphEndpoint);
};
