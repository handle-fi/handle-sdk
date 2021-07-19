export enum fxTokens {
  fxAUD = "fxAUD",
  fxEUR = "fxEUR",
  fxKRW = "fxKRW",
  fxCNY = "fxCNY"
}

export enum CollateralTokens {
  WETH = "WETH",
  WBTC = "WBTC",
  DAI = "DAI"
}

export const fxTokensArray = (() => {
  // Enums in typescript turn into a dictionary with index and value keys,
  // therefore the number of keys is duplicated.
  const keys = Object.keys(fxTokens);
  const values = [];
  for (let i = 0; i < keys.length / 2; i++) {
    values.push(keys[i]);
  }
  return values;
})();

export const collateralTokensArray = (() => {
  // Enums in typescript turn into a dictionary with index and value keys,
  // therefore the number of keys is duplicated.
  const keys = Object.keys(CollateralTokens);
  const values = [];
  for (let i = 0; i < keys.length / 2; i++) {
    values.push(keys[i]);
  }
  return values;
})();
