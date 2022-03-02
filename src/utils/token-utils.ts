import { Network, NetworkMap, Token } from "..";
import ethereumTokenList from "../data/tokens/ethereum-tokens.json";
import arbitrumTokenList from "../data/tokens/arbitrum-tokens.json";
import polygonTokenList from "../data/tokens/polygon-tokens.json";

export const getTokenDetails = (symbol: string, network: Network): Token<string> => {
  const tokenList: NetworkMap<Token<string>[]> = {
    arbitrum: arbitrumTokenList,
    polygon: polygonTokenList,
    ethereum: ethereumTokenList
  };

  const token = tokenList[network].find((token) => token.symbol === symbol);

  if (!token) {
    throw new Error("Could not find token");
  }

  return token;
};
