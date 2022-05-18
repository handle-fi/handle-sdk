import { HandleTokenManager, Network } from "../..";

export const getPositionTokenList = (network: Network) => {
  // These arrays will represent the possible positions that a user can be in.
  // This is used to fetch the positions from the contract.
  const collateralTokens: string[] = [];
  const indexTokens: string[] = [];
  const isLong: boolean[] = [];

  const tokenManager = new HandleTokenManager([]);
  const hlpTokens = tokenManager.getHlpTokens(network);
  for (let token of hlpTokens) {
    if (!token.extensions?.isStable && !token.extensions?.isWrappedNative) {
      collateralTokens.push(token.address);
      indexTokens.push(token.address);
      isLong.push(true);
    }

    // token should be stable from here
    if (!token.extensions?.isStable) continue;

    // Loop for non stable tokens.
    for (let j = 0; j < hlpTokens.length; j++) {
      const nonStableToken = hlpTokens[j];

      if (nonStableToken.extensions?.isStable) continue;
      if (nonStableToken.extensions?.isStable) continue;

      // Push stable token to collateral array.
      collateralTokens.push(token.address);
      indexTokens.push(nonStableToken.address);
      isLong.push(false);
    }
  }

  return {
    collateralTokens,
    indexTokens,
    isLong
  };
};
