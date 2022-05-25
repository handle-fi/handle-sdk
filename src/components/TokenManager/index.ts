import axios from "axios";
import handleTokenList from "./handle-tokens.json";
import nativeTokenList from "./native-tokens.json";
import { TokenList, TokenInfo } from "@uniswap/token-lists";
import { Network } from "../../types/network";
import { isSameNetwork, validateTokenList } from "../../utils/tokenlist-utils";

const HandleTokenList = validateTokenList(handleTokenList);
const NativeTokenList = validateTokenList(nativeTokenList);

type TokenListCache = {
  [url: string]: TokenList;
};

export const DEFAULT_TOKEN_LIST_URLS: string[] = [
  "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json", // polygon
  "https://bridge.arbitrum.io/token-list-42161.json", // arbitrum
  "https://api.coinmarketcap.com/data-api/v3/uniswap/all.json" // ethereum
];

type SearchTokenAddress = {
  address: string;
  network?: Network | number;
};

type SearchTokenSymbols = {
  symbol: string;
  network?: Network | number;
};

/**
 * The TokenList class is used to fetch and validate token lists.
 * @dev By default, native tokens are stored in the cache as "native-tokens"
 * and handle tokens are stored in the cache as "handle-tokens".
 */
class TokenManager {
  /** Caches fetched results indefinetely */
  protected cache: TokenListCache;
  protected customTokens: TokenInfo[];
  private seenTokens: Record<string, boolean> = {};

  public initialLoad: Promise<TokenList[]>;

  /** Called whenever the cache, or custom tokens changes */
  public onTokensChange: () => void;

  constructor(
    tokenListUrls: string[] = DEFAULT_TOKEN_LIST_URLS,
    includeHandleTokens = true,
    includeNativeTokens = true
  ) {
    this.cache = {};
    this.customTokens = [];
    this.onTokensChange = () => {};
    if (includeHandleTokens) this.setTokenList("handle-tokens", HandleTokenList);
    if (includeNativeTokens) this.setTokenList("native-tokens", NativeTokenList);
    this.initialLoad = Promise.all(tokenListUrls.map((url) => this.fetchTokenList(url)));
  }

  /**
   * Gets the key of a token in the seenTokens object
   * @param token the token to add
   * @returns the key of the token in the seen tokens object
   */
  protected getSeenTokenKey(token: TokenInfo) {
    return `${token.address.toLowerCase()}-${token.chainId}`;
  }

  /**
   * Sets a number of tokens as either seen or unseen
   * @param tokens the tokens to set in the seen tokens object
   * @param value the value to set them
   */
  protected setSeenTokens(tokens: TokenInfo[], value: boolean) {
    tokens.forEach((token) => {
      this.seenTokens[this.getSeenTokenKey(token)] = value;
    });
  }

  /**
   * Searches a list of tokens and returns tokens that have not been seen before.
   * Sets the all the tokens in the list to seen
   * @param tokens tokens to search
   * @returns the unseen tokens
   */
  protected getUnseenTokens(tokens: TokenInfo[]): TokenInfo[] {
    const unseenTokens = tokens.filter((token) => !this.seenTokens[this.getSeenTokenKey(token)]);
    this.setSeenTokens(tokens, true);
    return unseenTokens;
  }

  /**
   * extracts tokens from the token token lists to a flat array of all the tokens
   * @param tokenLists token lists to get tokens from
   * @returns the tokens from all token lists
   */
  protected getTokensFromLists(tokenLists: TokenList[]): TokenInfo[] {
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
    const allTokens = [...this.customTokens, ...this.getTokensFromLists(Object.values(this.cache))];
    if (network === undefined) {
      return allTokens;
    }
    return allTokens.filter((token) => isSameNetwork(token.chainId, network));
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
   * If multiple tokens are found with the same address and network, they will all be included.
   * @param search an array of objects with address as the address of the token, and network as the
   * network of the token
   * @returns an array of tokens with the given addresses.
   * @note this is not optimised for large addresses arrays
   */
  public getTokensByAddresses(search: SearchTokenAddress[]): TokenInfo[] {
    const returnTokens: TokenInfo[] = [];

    search.forEach((searchToken) => {
      const token = this.getLoadedTokens().find(
        (token) =>
          token.address.toLowerCase() === searchToken.address.toLowerCase() &&
          (searchToken.network ? isSameNetwork(token.chainId, searchToken.network) : true)
      );
      if (token) {
        returnTokens.push(token);
      }
    });
    return returnTokens;
  }

  /**
   * Returns an array of tokens with the given symbol. Order is not guaranteed.
   * If a token cannot be found with the given address, it will be omitted from the array.
   * If multiple tokens are found with the same address and network, they will all be included.
   * @param search an array of objects with address as the address of the token, and network as the
   * network of the token
   * @returns an array of tokens with the given symbol.
   * @note this is not optimised for large symbol arrays
   */
  public getTokensBySymbols(search: SearchTokenSymbols[]): TokenInfo[] {
    const returnTokens: TokenInfo[] = [];

    search.forEach((searchToken) => {
      const token = this.getLoadedTokens().find(
        (token) =>
          token.symbol === searchToken.symbol &&
          (searchToken.network ? isSameNetwork(token.chainId, searchToken.network) : true)
      );
      if (token) {
        returnTokens.push(token);
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
    const unseenTokenList = {
      ...tokenList,
      tokens: this.getUnseenTokens(tokenList.tokens)
    };
    this.cache[url] = unseenTokenList;
    this.onTokensChange();
    return tokenList;
  }

  /**
   * Fetches a list of tokenLists from the given urls
   * @param urls urls to fetch
   * @returns The fetched token lists
   */
  public async fetchTokenLists(urls: string[]) {
    return Promise.all(urls.map((url) => this.fetchTokenList(url)));
  }

  /**
   * Adds custom tokens to the token manager
   * @param tokens tokens to add
   */
  public addCustomTokens(tokens: TokenInfo[]) {
    this.customTokens.push(...this.getUnseenTokens(tokens));
    this.onTokensChange();
  }

  /**
   * Clears all custom tokens
   */
  public clearCustomTokens = () => {
    this.setSeenTokens(this.customTokens, false);
    this.customTokens = [];
    this.onTokensChange();
  };

  /**
   * Sets custom tokens as a list of tokens
   * @param tokens tokens to set
   */
  public setCustomTokens = (tokens: TokenInfo[]) => {
    this.customTokens = this.getUnseenTokens(tokens);
    this.onTokensChange();
  };

  /**
   * @returns all custom tokens
   */
  public getCustomTokens = () => {
    return this.customTokens;
  };

  /**
   * Gets a token list from the cache
   * @param key the key of the token list in the cache
   * @returns the token list with the given key
   */
  public getFromCache(key: string): TokenList | undefined {
    return this.cache[key];
  }

  /**
   * Sets a cache key to a token list
   * @param key the key in the cache for which to set the tokenList
   * @param tokenList the tokenList to set
   * @note this method allows duplicates
   */
  public setTokenList(key: string, tokenList: TokenList) {
    validateTokenList(tokenList);
    this.setSeenTokens(tokenList.tokens, true);
    this.cache[key] = tokenList;
    this.onTokensChange();
  }

  /**
   * Deletes a tokenList in the cache
   * @param key the key in the cache to delete
   */
  public deleteTokenList(key: string) {
    this.setSeenTokens(this.cache[key]?.tokens, false);
    delete this.cache[key];
    this.onTokensChange();
  }

  /**
   * Clears the token list cache
   */
  public clearCache() {
    this.cache = {};
    this.seenTokens = {};
    this.setSeenTokens(this.customTokens, true);
    this.onTokensChange();
  }

  /**
   * Gets the cache
   * @returns the cache
   */
  public getCache() {
    return this.cache;
  }
}

export default TokenManager;
