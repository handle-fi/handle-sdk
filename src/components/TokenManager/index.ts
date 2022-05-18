import axios from "axios";
import handleTokenList from "./handle-tokens.json";
import nativeTokenList from "./native-tokens.json";
import { TokenList as TokenListType, TokenInfo } from "@uniswap/token-lists";
import { Network } from "../../types/network";
import { isSameNetwork, validateTokenList } from "../../utils/tokenlist-utils";

const HandleTokenList = validateTokenList(handleTokenList);
const NATIVE_TOKENS = validateTokenList(nativeTokenList);

type TokenListCache = {
  [url: string]: TokenListType;
};

export const DEFAULT_FETCH_URLS: string[] = [
  "https://api-polygon-tokens.polygon.technology/tokenlists/allTokens.tokenlist.json", // polygon
  "https://bridge.arbitrum.io/token-list-42161.json", // arbitrum
  "https://api.coinmarketcap.com/data-api/v3/uniswap/all.json" // ethereum
];

/**
 * The TokenList class is used to fetch and validate token lists.
 */
class TokenManager {
  /** Caches fetched results indefinetely */
  public cache: TokenListCache;

  constructor(
    tokenListUrls: string[] = DEFAULT_FETCH_URLS,
    includeHandleTokens = true,
    includeNativeTokens = true
  ) {
    this.cache = {};
    if (includeHandleTokens) this.cache["handle-tokens"] = HandleTokenList;
    if (includeNativeTokens) this.cache["native-tokens"] = NATIVE_TOKENS;
    tokenListUrls.forEach((url) => this.fetchTokenList(url));
  }

  /**
   * extracts tokens from the token token lists to a flat array of all the tokens
   * @param tokenLists token lists to get tokens from
   * @returns the tokens from all token lists
   */
  protected getTokensFromLists(tokenLists: TokenListType[]): TokenInfo[] {
    return tokenLists.reduce<TokenInfo[]>((acc, tokenList) => acc.concat(tokenList.tokens), []);
  }

  /**
   * @param urls urls to fetch
   * @returns cached token lists if the cached urls exist, otherwise fetches and returns the tokenlist
   */
  public async getTokensFromUrls(urls: string[]): Promise<TokenInfo[]> {
    const tokenLists = await Promise.all(urls.map((url) => this.fetchTokenList(url)));
    return this.getTokensFromLists(tokenLists);
  }

  /**
   * @returns all tokens from all cached token lists
   */
  public getLoadedTokens(network?: Network | number): TokenInfo[] {
    if (network === undefined) {
      return this.getTokensFromLists(Object.values(this.cache));
    }
    return this.getTokensFromLists(Object.values(this.cache)).filter((token) =>
      isSameNetwork(token.chainId, network)
    );
  }

  /**
   * @param symbol symbol of the token to get
   * @param network the network to get the token from
   * @returns the first occurence of the token with the given symbol, or undefined if not found
   */
  public getTokenBySymbol<Symbol extends string>(
    symbol: Symbol,
    network: Network | number
  ): (TokenInfo & { symbol: Symbol }) | undefined {
    const tokens = this.getLoadedTokens(network);
    // In alot of other places, token symbols are strong typed. This typing allows for this, as it is known that if
    // a token is found with the given symbol, it will be the type of the symbol.
    return tokens.find((token) => token.symbol === symbol) as
      | (TokenInfo & { symbol: Symbol })
      | undefined;
  }

  /**
   * @param address address of the token to get
   * @param network the network to get the token from
   * @returns the first occurence of the token with the given address, or undefined if not found
   */
  public getTokenByAddress(address: string, network: Network | number): TokenInfo | undefined {
    const tokens = this.getLoadedTokens(network);
    return tokens.find((token) => token.address.toLowerCase() === address.toLowerCase());
  }

  /**
   * Finds the native token for a network
   * @param network the network from which to get the token
   * @returns the native token if one exists, otherwise undefined
   */
  public getNativeToken(network: Network | number) {
    return this.getLoadedTokens(network).find((token) => token.extensions?.isNative);
  }

  /**
   * Returns an array of tokens with the given addresses. Order is not guaranteed.
   * If a token cannot be found with the given address, it will be omitted from the array.
   * If multiple tokens are found with the same address, only the first found will be included.
   * @param addresses addresses of the tokens to get
   * @returns an array of tokens with the given addresses.
   * @note this is not optimised for large addresses arrays
   */
  public getTokensByAddresses(addresses: string[]): TokenInfo[] {
    const seenAddresses: string[] = [];
    const returnTokens: TokenInfo[] = [];
    this.getLoadedTokens().forEach((token) => {
      if (addresses.some((address) => address.toLowerCase() === token.address.toLowerCase())) {
        if (
          !seenAddresses.some((address) => address.toLowerCase() === token.address.toLowerCase())
        ) {
          returnTokens.push(token);
          seenAddresses.push(token.address);
        }
      }
    });
    return returnTokens;
  }

  /**
   * fetches a token list
   * @param url url to fetch
   * @returns the token list
   * @throws if the token list is invalid
   */
  public async fetchTokenList(url: string) {
    if (this.cache[url]) {
      return this.cache[url];
    }

    const { data } = await axios.get(url);
    const tokenList = validateTokenList(data);
    this.cache[url] = tokenList;
    return tokenList;
  }
}

export default TokenManager;
