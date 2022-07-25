import { BigNumber } from "ethers";
import { request, gql } from "graphql-request";
import { config } from "../..";

type TokenConfigResponse = {
  token: string;
  isWhitelisted: boolean;
  tokenDecimals: string;
  tokenWeight: string;
  minProfitBasisPoints: string;
  maxUsdgAmount: string;
  isStable: boolean;
  isShortable: boolean;
};

export type TokenConfig = {
  token: string;
  isWhitelisted: boolean;
  tokenDecimals: number;
  tokenWeight: number;
  minProfitBasisPoints: number;
  maxUsdHlpAmount: BigNumber;
  isStable: boolean;
  isShortable: boolean;
};

export const getTokenConfig = async (): Promise<TokenConfig[]> => {
  try {
    const response = await request<TokenConfigResponse[]>(
      config.theGraphEndpoints.arbitrum.trade,
      gql`
        query {
          tokenConfigs(first: 1000) {
            token
            isWhitelisted
            tokenDecimals
            tokenWeight
            minProfitBasisPoints
            maxUsdgAmount
            isStable
            isShortable
          }
        }
      `
    );
    if (!Array.isArray(response)) throw new Error("Response is not an array");
    return response.map((raw) => ({
      token: raw.token,
      isWhitelisted: raw.isWhitelisted,
      tokenDecimals: +raw.tokenDecimals,
      tokenWeight: +raw.tokenWeight,
      minProfitBasisPoints: +raw.minProfitBasisPoints,
      maxUsdHlpAmount: BigNumber.from(raw.maxUsdgAmount),
      isStable: raw.isStable,
      isShortable: raw.isShortable
    }));
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch token config");
  }
};
