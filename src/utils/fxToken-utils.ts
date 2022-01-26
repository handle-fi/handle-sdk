import { FxToken, FxTokenSymbol, FxTokenSymbolMap } from "..";

export const getAvailableAddresses = <T>(
  addresses: Partial<T>
): {
  symbol: keyof T;
  address: string;
}[] => {
  return (Object.keys(addresses) as []).map((key) => {
    const k = key as any;
    const a = addresses as any;

    return {
      symbol: key,
      address: a[k]
    };
  });
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

export const getFxTokenBySymbol = (fxTokens: FxToken[], symbol: FxTokenSymbol): FxToken => {
  const fxToken = fxTokens.find((fxToken) => fxToken.symbol === symbol);

  if (!fxToken) {
    throw new Error(`Could not find fxToken: ${symbol}`);
  }

  return fxToken;
};
