import { gql, request } from "graphql-request";
import { Network } from "../types/network";

const hpsmGraphEndpoint = "https://api.thegraph.com/subgraphs/name/handle-fi/handle-psm";

type Peg = {
  fxToken: string;
  peggedToken: string;
};

export const getTokenPegs = async (): Promise<Peg[]> => {
  return request(
    hpsmGraphEndpoint,
    gql`
      query {
        pairs {
          fxToken
          peggedToken
        }
      }
    `
  );
};

export const isTokenPegged = async (
  fxToken: string,
  pegToken: string,
  network: Network
): Promise<boolean> => {
  if (network !== "arbitrum") return false;
  const pegged = await getTokenPegs();
  return !!pegged.find(
    (peg) =>
      peg.fxToken.toLowerCase() == fxToken.toLowerCase() &&
      peg.peggedToken.toLowerCase() == pegToken.toLowerCase()
  );
};
