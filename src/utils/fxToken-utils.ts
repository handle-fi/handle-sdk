import { FxTokenSymbol, FxTokenSymbolMap, TokenInfo } from "..";
import { FxToken } from "../types/fxTokens";
import { HandleTokenManager } from "..";

export const getFxTokensFromAddresses = (addresses: string[]): TokenInfo[] => {
  return new HandleTokenManager([]).getTokensByAddresses(addresses.map((address) => ({ address })));
};

export const getFxTokenSymbolFromAddress = (
  address: string,
  config: FxTokenSymbolMap<string>
): FxTokenSymbol => {
  const keys = Object.keys(config) as FxTokenSymbol[];

  return keys.find((k) => {
    const symbol = k as FxTokenSymbol;
    return config[symbol].toLowerCase() === address.toLowerCase();
  })!;
};

export const getFxTokenByAddress = (fxTokens: FxToken[], address: string): FxToken => {
  const fxToken = fxTokens.find(
    (fxToken) => fxToken.address.toLowerCase() === address.toLowerCase()
  );

  if (!fxToken) {
    throw new Error(`Could not find fxToken: ${address}`);
  }

  return fxToken;
};

export const getFxTokenPricedBySymbol = (fxTokens: FxToken[], symbol: FxTokenSymbol): FxToken => {
  const fxToken = fxTokens.find((fxToken) => fxToken.symbol === symbol);

  if (!fxToken) {
    throw new Error(`Could not find fxToken: ${symbol}`);
  }

  return fxToken;
};
