import { TokenInfo } from "@uniswap/token-lists";
import TokenManager from ".";
import { Network } from "../..";

/**
 * TokenManager that comes with handle tokens by default.
 * Handle supported token extensions:
 * - isNative: true if token is native for that network (e.g. ETH, MATIC)
 * - isHlpToken: true if the token is a hlp token in a handle Vault contract
 * - isWrappedNative: true if the token is a wrapped version of a native token (e.g. WETH)
 * - isStable: true if the token is a USD stablecoin, false otherwise
 * - isFxToken: true if token is a fx token, false otherwise
 * @note the handle liquidity token (symbol hLP) has isHlpToken set to false, as it is not technically in the liquidity pool
 */
class HandleTokenManager extends TokenManager {
  constructor(tokenListUrls: string[] = [], includeNativeTokens = true) {
    super(tokenListUrls, true, includeNativeTokens);
  }

  /**
   * Creates an instance of HandleTokenList from a TokenList instance.
   * @param tokenList the tokenList from which to construct the HandleTokenList
   * @returns an instance of HandleTokenList with the cache of the tokenList
   */
  public static from(tokenList: TokenManager): HandleTokenManager {
    const handleList = new HandleTokenManager();
    Object.assign(handleList.cache, tokenList.cache);
    return handleList;
  }

  /**
   * Gets all hLP tokens for a network
   * @param network the network on which to search for tokens
   * @returns all hLP tokens for the network
   */
  public getHlpTokens(network: number | Network): TokenInfo[] {
    return this.getLoadedTokens(network).filter((token) => token.extensions?.isHlpToken);
  }

  /**
   * Checks if a token is a supported hLP token by its symbol
   * @param symbol the symbol of the token to check
   * @param network the network on which to check the token
   * @returns wheteher the token is a hlpToken
   */
  public isHlpTokenBySymbol(symbol: string, network: Network | number): boolean {
    const tokens = this.getLoadedTokens(network);
    return tokens.some((token) => token.symbol === symbol && token.extensions?.isHlpToken);
  }

  /**
   * Checks if a token is a supported hLP token by its address
   * @param address the address of the token to check
   * @param network the network on which to check the token
   * @returns wheteher the token is a hlpToken
   */
  public isHlpTokenByAddress(address: string, network: Network | number): boolean {
    const tokens = this.getLoadedTokens(network);
    return tokens.some(
      (token) =>
        token.address.toLowerCase() === address.toLowerCase() && token.extensions?.isHlpToken
    );
  }

  /**
   * Checks if the token is a stable hLP token
   * @param symbol the symbol of the token to check
   * @param network the network on which to check the token
   * @returns whether there exists a stable hLP token with the given symbol
   */
  public isHlpStableTokenBySymbol(symbol: string, network: Network | number): boolean {
    return this.getLoadedTokens(network).some(
      (token) =>
        token.symbol === symbol && token.extensions?.isStable && token.extensions?.isHlpToken
    );
  }

  /**
   * Checks if the token is a stable hLP token
   * @param address the address of the token to check
   * @param network the network on which to check the token
   * @returns whether there exists a stable hLP token with the given address
   */
  public isHlpStableTokenByAddress(address: string, network: Network | number): boolean {
    return this.getLoadedTokens(network).some(
      (token) =>
        token.address.toLowerCase() === address.toLowerCase() &&
        token.extensions?.isStable &&
        token.extensions?.isHlpToken
    );
  }

  /**
   * Finds the hLP compatible wrapped native token for a network
   * @param network the network from which to get the token
   * @returns the wrapped native token if one exists, otherwise undefined
   */
  public getHlpWrappedNativeToken(network: Network | number) {
    return this.getLoadedTokens(network).find(
      (token) => token.extensions?.isWrappedNative && token.extensions?.isHlpToken
    );
  }

  /**
   * Gets the handle liquidity pool token (symbol hLP) for a network
   * @param network the network on which to find the token
   * @returns the handle liquidity pool token if it exists, otherwise undefined
   */
  public getHandleLiquidityToken(network: Network | number): TokenInfo | undefined {
    const tokens = this.getLoadedTokens(network);
    return tokens.find((token) => token.symbol === "hLP");
  }

  /**
   * Parses a token into a hLP wrapped native token if it is a native token
   * @param token the token to check
   * @returns an object with the properties isNative and hlpAddress. If the token is native, isNative is
   * true and hlpAddress is the address of a hlp compatible wrapped native token. If the token is a hLP
   * token, isNative is false and hlpAddress is the address of the hLP token.
   * @throws if the token is neither native, nor a hLP token
   * @throws if the token is native, and no hLP compatible wrapped native token exists
   */
  public checkForHlpNativeToken(token: TokenInfo): { isNative: boolean; hlpAddress: string } {
    if (token.extensions?.isNative) {
      const wrappedNative = this.getHlpWrappedNativeToken(token.chainId);
      if (!wrappedNative) {
        throw new Error("Token is native but no hlp compatible wrapped native token found");
      }
      return { isNative: true, hlpAddress: wrappedNative.address };
    }
    if (!token.extensions?.isHlpToken) {
      throw new Error("Token is neither a hlp token nor native");
    }
    return { isNative: false, hlpAddress: token.address };
  }
}

export default HandleTokenManager;
