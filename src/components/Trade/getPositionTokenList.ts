import { HlpConfig, Network } from "../..";

export const getPositionTokenList = (network: Network) => {
  // These arrays will represent the possible positions that a user can be in.
  // This is used to fetch the positions from the contract.
  const collateralTokens: string[] = [];
  const indexTokens: string[] = [];
  const isLong: boolean[] = [];

  const perpTokens = HlpConfig.HLP_TOKENS[network] || [];
  for (let token of perpTokens) {
    if (!token.isStable && !token.isWrapped) {
      collateralTokens.push(token.address);
      indexTokens.push(token.address);
      isLong.push(true);
    }

    // token should be stable from here
    if (!token.isStable) continue;

    // Loop for non stable tokens.
    for (let j = 0; j < perpTokens.length; j++) {
      const nonStableToken = perpTokens[j];

      if (nonStableToken.isStable) continue;
      if (nonStableToken.isWrapped) continue;

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
