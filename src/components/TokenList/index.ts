import axios from "axios";
import handleTokenList from "./handle-tokens.json";
import nativeTokenList from "./native-tokens.json";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { schema, TokenList as TokenListType, TokenInfo } from "@uniswap/token-lists";
import { Network } from "../../types/network";
import { NETWORK_NAME_TO_CHAIN_ID } from "../..";

/* construct validators */
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);
const tokenSchemeValidator = ajv.compile(schema);

const HandleTokenList = handleTokenList as TokenListType;
const NATIVE_TOKENS = nativeTokenList as TokenListType;

/* validate token lists */
if (!tokenSchemeValidator(HandleTokenList) || !tokenSchemeValidator(NATIVE_TOKENS)) {
  console.error(tokenSchemeValidator.errors);
  throw new Error("Inbuilt token list validation failed");
}

type TokenListCache = {
  [url: string]: TokenListType;
};

class TokenList {
  protected cache: TokenListCache;

  constructor(
    tokenListUrls: string[] = [],
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
    if (!network) {
      return this.getTokensFromLists(Object.values(this.cache));
    }
    return this.getTokensFromLists(Object.values(this.cache)).filter((token) => {
      // @ts-ignore we can index into NETWORK_NAME_TO_CHAIN_ID as if it is a chain id, it will return
      // undefined, which is ok as it is handled in the first half of the boolean expression
      return token.chainId === network || token.chainId === NETWORK_NAME_TO_CHAIN_ID[network];
    });
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
    const valid = tokenSchemeValidator(data as unknown);

    if (!valid) {
      console.error(tokenSchemeValidator.errors);
      throw new Error("Invalid token list");
    } else {
      this.cache[url] = data as TokenListType;
      return data as TokenListType;
    }
  }
}

export default TokenList;
