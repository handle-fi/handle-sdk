import {Pair, SignedQuote} from "../types/trade";
import {BytesLike, ethers} from "ethers";
import {config} from "../index";

export const encodeQuotes = (quotes: SignedQuote[]): BytesLike => {
  const concatenatedSignatures = quotes.reduce((buffer, quote, i) => {
    for (let j = 0; j < 65; j++) {
      const offset = i * 65;
      buffer[offset + j] = quote.signature[j];
    }
    return buffer;
  }, new Uint8Array(quotes.length * 65));
  const tokenAddresses = quotes
    .map(quote => quotePairBaseToTokenAddress(quote.pair));
  return ethers.utils.defaultAbiCoder.encode(
    [
      "uint256",
      "address[]",
      "uint256[]",
      "uint256[]",
      "uint256[]",
      "uint256[]",
      "bytes"
    ],
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

type PairAddressConverter = (pair: Pair) => string | undefined;

/// Converts a Pair's quote to a token address, or throws.
export const quotePairBaseToTokenAddress = (pair: Pair): string => {
  // ETH (WETH on arbitrum) pair/address converter.
  const eth: PairAddressConverter = (pair: Pair): string | undefined => {
    if (pair.quote !== "ETH") return;
    return config.protocol.arbitrum.collaterals.WETH.address;
  };
  // fxToken pair/address converter.
  const fxToken: PairAddressConverter = (pair: Pair): string | undefined => {
    const fxTokenQuote = pair.quote.startsWith("fx")
      ? pair.quote
      : `fx${pair.quote}`;
    return config.fxTokenAddresses[fxTokenQuote];
  };
  // Find a valid address conversion.
  const result = [eth, fxToken]
    .map(converter => converter(pair))
    .find(address => address != null);
  if (!result)
    throw new Error(`Could get address for ${pair.base}/${pair.quote}`);
  return result;
};
