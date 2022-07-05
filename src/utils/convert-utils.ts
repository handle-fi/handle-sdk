import { gql, request } from "graphql-request";
import config from "../config";
import { Network } from "../types/network";

type Peg = {
  fxToken: string;
  peggedToken: string;
};

export const getTokenPegs = async (network: Network): Promise<Peg[]> => {
  if (network !== "arbitrum") return [];
  const response = await request(
    config.theGraphEndpoints[network].hpsm,
    gql`
      query {
        pairs(first: 1000) {
          fxToken
          peggedToken
        }
      }
    `
  );
  if (response && Array.isArray(response.pairs)) {
    return response.pairs;
  }
  throw new Error(
    `Response does not contain property 'pairs' of type array. Response: ${response}`
  );
};

export const isTokenPegged = async (
  fxToken: string,
  peggedToken: string,
  network: Network
): Promise<boolean> => {
  try {
    const pegged = await getTokenPegs(network);
    return !!pegged.find(
      (peg) =>
        peg.fxToken.toLowerCase() == fxToken.toLowerCase() &&
        peg.peggedToken.toLowerCase() == peggedToken.toLowerCase()
    );
  } catch (e) {
    return false;
  }
};
