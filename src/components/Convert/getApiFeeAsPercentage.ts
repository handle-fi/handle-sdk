import { TokenExtended } from "../..";
import { Network, NetworkMap } from "../../types/network";
import ethereum from "../../data/tokens/ethereum-tokens.json";
import polygon from "../../data/tokens/polygon-tokens.json";
import arbitrum from "../../data/tokens/arbitrum-tokens.json";
import config from "../../config";

const NETWORK_TO_TOKENS: NetworkMap<TokenExtended<string>[]> = {
  ethereum,
  arbitrum,
  polygon
};

export const getApiFeeAsPercentage = async (
  network: Network,
  sellTokenAddress: string,
  buyTokenAddress: string
): Promise<number> => {
  const SAME_CURRENCY_STABLE_TO_SAME_CURRENCY_STABLE_FEE = 0.04;
  const STABLE_TO_STABLE_FEE = 0.1;
  const NON_STABLE_FEE = 0.3;

  const sellToken = NETWORK_TO_TOKENS[network].find(
    (token) => token.address.toLowerCase() === sellTokenAddress.toLowerCase()
  );

  const buyToken = NETWORK_TO_TOKENS[network].find(
    (token) => token.address.toLowerCase() === buyTokenAddress.toLowerCase()
  );

  if (buyToken?.address === config.forexAddress) {
    return 0;
  }

  if (!sellToken || !buyToken) {
    // if one of the tokens cant be found it isnt a swap between our recognised stables
    return NON_STABLE_FEE;
  }

  const sellTokenStableType = config.convert.tokenSymbolToStableType[sellToken.symbol];
  const buyTokenStableType = config.convert.tokenSymbolToStableType[buyToken.symbol];

  if (!sellTokenStableType || !buyTokenStableType) {
    // if one of the token doesnt have a type it isnt a swap between our recognised stables
    return NON_STABLE_FEE;
  }

  if (sellTokenStableType === buyTokenStableType) {
    // both are the same currency stable coin
    return SAME_CURRENCY_STABLE_TO_SAME_CURRENCY_STABLE_FEE;
  }

  // both stables but different currencies
  return STABLE_TO_STABLE_FEE;
};
