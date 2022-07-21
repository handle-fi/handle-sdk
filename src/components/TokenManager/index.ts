import axios from "axios";
import { TokenList, TokenInfo } from "@uniswap/token-lists";
import { Network } from "../../types/network";
import { isSameNetwork, validateTokenList } from "../../utils/tokenlist-utils";

type TokenListCache = {
  [url: string]: TokenList;
};

export const DEFAULT_TOKEN_LIST_URLS: string[] = [
  "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json", // polygon
  "https://bridge.arbitrum.io/token-list-42161.json", // arbitrum
  "https://wispy-bird-88a7.uniswap.workers.dev/?url=http://tokens.1inch.eth.link" // ethereum
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
 */
class TokenManager {
  /** Caches fetched results indefinitely */
  protected cache: TokenListCache;
  protected customTokens: TokenInfo[];

  public initialLoad: Promise<TokenList[]>;

  /** Called whenever the cache, or custom tokens changes */
  public onTokensChange: () => void;

  constructor(tokenListUrls: string[] = DEFAULT_TOKEN_LIST_URLS) {
    this.cache = {};
    this.customTokens = [];
    this.onTokensChange = () => {};
    this.initialLoad = Promise.all(tokenListUrls.map((url) => this.fetchTokenList(url)));
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
   * Removes tokens that are duplicates of each other by comparing their symbol and chainId
   * @param tokens tokens from which to remove duplicates
   * @returns the tokens with duplicates removed
   */
  protected static removeDuplicates(tokens: TokenInfo[]): TokenInfo[] {
    const tokenKey = (token: TokenInfo) => `${token.symbol}-${token.chainId}`;
    const seen: Record<string, boolean> = {};
    const noDuplicates: TokenInfo[] = [];

    tokens.forEach((token) => {
      seen[tokenKey(token)] = true;
    });

    tokens.forEach((token) => {
      if (seen[tokenKey(token)]) {
        noDuplicates.push(token);
        seen[tokenKey(token)] = false;
      }
    });

    return noDuplicates;
  }

  /**
   * @returns all tokens from all cached token lists
   */
  public getLoadedTokens(network?: Network | number, removeDuplicates = true): TokenInfo[] {
    const allTokens = [...this.customTokens, ...this.getTokensFromLists(Object.values(this.cache))];
    let returnTokens = allTokens;

    if (removeDuplicates) {
      returnTokens = TokenManager.removeDuplicates(allTokens);
    }

    if (network === undefined) {
      return returnTokens;
    }
    return returnTokens.filter((token) => isSameNetwork(token.chainId, network));
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

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      }
    });
    const tokenList = validateTokenList(data);
    this.cache[url] = tokenList;
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
    this.customTokens.push(...tokens);
    this.onTokensChange();
  }

  /**
   * Clears all custom tokens
   */
  public clearCustomTokens = () => {
    this.customTokens = [];
    this.onTokensChange();
  };

  /**
   * Sets custom tokens as a list of tokens
   * @param tokens tokens to set
   */
  public setCustomTokens = (tokens: TokenInfo[]) => {
    this.customTokens = tokens;
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
   */
  public setTokenList(key: string, tokenList: TokenList) {
    validateTokenList(tokenList);
    this.cache[key] = tokenList;
    this.onTokensChange();
  }

  /**
   * Deletes a tokenList in the cache
   * @param key the key in the cache to delete
   */
  public deleteTokenList(key: string) {
    delete this.cache[key];
    this.onTokensChange();
  }

  /**
   * Clears the token list cache
   */
  public clearCache() {
    this.cache = {};
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
