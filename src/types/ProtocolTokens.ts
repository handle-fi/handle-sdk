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
  const keys = Object.keys(fxTokens);
  const values: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (!values.includes(keys[i]))
      values.push(keys[i]);
  }
  return values;
})();

export const collateralTokensArray = (() => {
  const keys = Object.keys(CollateralTokens);
  const values: string[] = [];
  for (let i = 0; i < keys.length / 2; i++) {
    if (!values.includes(keys[i]))
      values.push(keys[i]);
  }
  return values;
})();
