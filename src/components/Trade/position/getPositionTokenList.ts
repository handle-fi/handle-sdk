import { HandleTokenManager, Network } from "../../..";

/**
 * Gets all viable combinations of collateral tokens, index tokens
 * and whether the position is long or short
 * @param network the network from which to fetch the list
 * @returns an object with the list of collateral tokens, index tokens,
 * and whether or not the position is long
 */
export const getPositionTokenList = (network: Network) => {
  // These arrays will represent the possible positions that a user can be in.
  // This is used to fetch the positions from the contract.
  const collateralTokens: string[] = [];
  const indexTokens: string[] = [];
  const isLong: boolean[] = [];

  const tokenManager = new HandleTokenManager();
  const hlpTokens = tokenManager.getHlpTokens(network);

  if (!hlpTokens) {
    return {
      collateralTokens,
      indexTokens,
      isLong
    };
  }

  // push tokens for long positions
  const nonStableTokens = hlpTokens.filter((token) => !token.extensions?.isStable);
  const stableTokens = hlpTokens.filter((token) => token.extensions?.isStable);
  nonStableTokens.forEach((token) => {
    collateralTokens.push(token.address);
    indexTokens.push(token.address);
    isLong.push(true);
  });

  // push tokens for short positions
  stableTokens.forEach((stableToken) => {
    nonStableTokens.forEach((nonStableToken) => {
      if (nonStableToken.extensions?.isShortable) {
        collateralTokens.push(stableToken.address);
        indexTokens.push(nonStableToken.address);
        isLong.push(false);
      }
    });
  });

  return {
    collateralTokens,
    indexTokens,
    isLong
  };
};
