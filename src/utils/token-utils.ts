import { Network, NetworkMap, Token } from "..";
import { ARBITRUM_TOKEN_LIST, ETHEREUM_TOKEN_LIST, POLYGON_TOKEN_LIST } from "../data/tokens";

export const getTokenDetails = (symbol: string, network: Network): Token<string> => {
  const tokenList: NetworkMap<Token<string>[]> = {
    arbitrum: ARBITRUM_TOKEN_LIST,
    polygon: POLYGON_TOKEN_LIST,
    ethereum: ETHEREUM_TOKEN_LIST
  };

  const token = tokenList[network].find((token) => token.symbol === symbol);

  if (!token) {
    throw new Error("Could not find token");
  }

  return token;
};
