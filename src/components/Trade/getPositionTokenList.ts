import { HlpConfig, Network } from "../..";

export const getPositionTokenList = (network: Network) => {
  // These arrays will represent the possible positions that a user can be in.
  // This is used to fetch the positions from the contract.
  const collateralTokens: string[] = [];
  const indexTokens: string[] = [];
  const isLong: boolean[] = [];

  const hlpTokens = HlpConfig.HLP_TOKENS[network];
  if (!hlpTokens) {
    return {
      collateralTokens,
      indexTokens,
      isLong
    };
  }

  // push tokens for long positions
  const nonStableTokens = hlpTokens.filter((token) => !token.isStable && !token.isWrapped);
  const stableTokens = hlpTokens.filter((token) => token.isStable && !token.isWrapped);
  nonStableTokens.forEach((token) => {
    collateralTokens.push(token.address);
    indexTokens.push(token.address);
    isLong.push(true);
  });

  // push tokens for short positions
  stableTokens.forEach((stableToken) => {
    nonStableTokens.forEach((nonStableToken) => {
      if (nonStableToken.isShortable) {
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
