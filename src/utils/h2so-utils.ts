import { Pair, SignedQuote } from "../types/trade";
import { BigNumber, BytesLike, ethers } from "ethers";
import { config } from "../index";
import axios from "axios";
import { DATA_FEED_API_BASE_URL } from "../config";

type QuoteApiResponse = {
  data: {
    /// Quote value as an 8 decimal number.
    result: number;
    signed: {
      signatureParams: {
        signedTimestamp: number;
        chainId: number;
        /// Timestamp from which the quote is valid. Seconds since unix epoch.
        validFromTimestamp: number;
        durationSeconds: number;
      };
      /// Hex-encoded signature.
      signature: string;
      /// Hex-encoded unsigned message.
      message: string;
    };
  };
};

export const fetchEncodedSignedQuotes = async (pairs: Pair[]): Promise<BytesLike> => {
  return encodeQuotes(await fetchSignedQuotes(pairs));
};

const fetchSignedQuotes = async (pairs: Pair[]) => {
  for (let pair of pairs) {
    // Replace WETH by ETH.
    pair.baseSymbol = pair.baseSymbol.replace(/WETH/g, "ETH");
    pair.quoteSymbol = pair.quoteSymbol.replace(/WETH/g, "ETH");
  }
  const responses: QuoteApiResponse[] = [];
  const requests = pairs.map(async (pair) => {
    // The only base symbol that can be requested as fxToken is fxUSD.
    const base =
      pair.baseSymbol.startsWith("fx") && pair.baseSymbol !== "fxUSD"
        ? pair.baseSymbol.substring(2)
        : pair.baseSymbol;
    console.log(`${DATA_FEED_API_BASE_URL}${base}/${pair.quoteSymbol}?sign=true`);
    const result = await axios.get(
      `${DATA_FEED_API_BASE_URL}${base}/${pair.quoteSymbol}?sign=true`
    );
    responses.push(result.data);
  });
  await Promise.all(requests);
  return responses.map((response, i) => quoteApiResponseToSignedQuote(pairs[i], response));
};

const quoteApiResponseToSignedQuote = (
  pair: Pair,
  {
    data: {
      result,
      signed: { signatureParams, signature }
    }
  }: QuoteApiResponse
): SignedQuote => {
  return {
    pair,
    signature: signature.startsWith("0x")
      ? ethers.utils.arrayify(signature)
      : ethers.utils.arrayify(`0x${signature}`),
    signatureParams: {
      value: BigNumber.from(result),
      signedTimestamp: BigNumber.from(signatureParams.signedTimestamp),
      chainId: signatureParams.chainId,
      validFromTimestamp: BigNumber.from(signatureParams.validFromTimestamp),
      durationSeconds: BigNumber.from(signatureParams.durationSeconds)
    }
  };
};

const encodeQuotes = (quotes: SignedQuote[]): BytesLike => {
  const concatenatedSignatures = quotes.reduce((buffer, quote, i) => {
    for (let j = 0; j < 65; j++) {
      const offset = i * 65;
      buffer[offset + j] = quote.signature[j];
    }
    return buffer;
  }, new Uint8Array(quotes.length * 65));
  const tokenAddresses = quotes.map((quote) => symbolToAddress(quote.pair.quoteSymbol));
  return ethers.utils.defaultAbiCoder.encode(
    ["uint256", "address[]", "uint256[]", "uint256[]", "uint256[]", "uint256[]", "bytes"],
    [
      tokenAddresses.length,
      tokenAddresses,
      quotes.map((quote) => quote.signatureParams.value),
      quotes.map((quote) => quote.signatureParams.signedTimestamp),
      quotes.map((quote) => quote.signatureParams.validFromTimestamp),
      quotes.map((quote) => quote.signatureParams.durationSeconds),
      concatenatedSignatures
    ]
  );
};

type SymbolAddressConverter = (symbol: string) => string | undefined;

const symbolToAddress = (symbol: string): string => {
  const eth: SymbolAddressConverter = (symbol: string): string | undefined => {
    if (symbol !== "ETH") return;
    return config.protocol.arbitrum.collaterals.WETH.address;
  };
  const fxToken: SymbolAddressConverter = (symbol: string): string | undefined => {
    const fxSymbol = symbol.startsWith("fx") ? symbol : `fx${symbol}`;
    return config.fxTokenAddresses[fxSymbol];
  };
  // Find a valid address conversion.
  const result = [eth, fxToken]
    .map((converter) => converter(symbol))
    .find((address) => address != null);
  if (!result) throw new Error(`Could get address for symbol "${symbol}"`);
  return result;
};
