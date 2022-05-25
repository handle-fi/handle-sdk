import { expect } from "chai";
import { TokenManager } from "../../../src";
import { DEFAULT_TOKEN_LIST_URLS } from "../../../src/components/TokenManager";

describe("TokenManager", () => {
  it("Should load tokenLists from an external source", async () => {
    const tokenManager = new TokenManager([], false, false);
    expect(tokenManager.getLoadedTokens().length).to.eq(0);
    await tokenManager.fetchTokenLists(DEFAULT_TOKEN_LIST_URLS);
    expect(tokenManager.getLoadedTokens().length).to.be.greaterThan(0);
  });
  it("Should load handleTokens and nativeTokens immediately", () => {
    const tokenManager = new TokenManager([], true, true);
    expect(tokenManager.getFromCache("handle-tokens")).to.exist;
    expect(tokenManager.getFromCache("handle-tokens")).to.exist;
  });
  it("Should allow the cache to be edited manually", () => {
    const tokenManager = new TokenManager([], true, true);
    const handleTokenList = tokenManager.getFromCache("handle-tokens");
    expect(handleTokenList).to.exist;
    tokenManager.deleteTokenList("handle-tokens");
    expect(tokenManager.getFromCache("handle-tokens")).to.not.exist;
    tokenManager.setTokenList("handle-tokens", handleTokenList!);
    expect(tokenManager.getFromCache("handle-tokens")).to.exist;

    tokenManager.clearCache();
    expect(tokenManager.getFromCache("handle-tokens")).to.not.exist;
    expect(tokenManager.getFromCache("native-tokens")).to.not.exist;
  });
  it("should throw if a tokenList is invalid", async () => {
    const tokenManager = new TokenManager([], true, true);
    expect(() =>
      tokenManager.setTokenList("invalid-token-list", {
        name: "invalid-token-list-too-long-name-that-is-way-too-long-to-be-valid",
        tokens: [],
        timestamp: "invalid-timestamp",
        version: {
          major: 0,
          minor: 0,
          patch: 0
        }
      })
    ).to.throw(Error);
    try {
      await tokenManager.fetchTokenList("https://www.google.com");
      fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).to.eq("Failed to validate token list");
    }
  });
  it("Should be able to search tokens", () => {
    const tokenManager = new TokenManager([], true, true);
    const tokenBySymbol = tokenManager.getTokenBySymbol("FOREX", "arbitrum");
    expect(tokenBySymbol).to.exist;
    expect(tokenBySymbol?.symbol).to.eq("FOREX");
    expect(tokenBySymbol?.chainId).to.eq(42161);

    const tokenByAddress = tokenManager.getTokenByAddress(
      "0x116172B2482c5dC3E6f445C16Ac13367aC3FCd35",
      "polygon"
    );
    expect(tokenByAddress).to.exist;
    expect(tokenByAddress?.symbol).to.eq("fxEUR");
    expect(tokenByAddress?.chainId).to.eq(137);

    const tokenByAddressWithCapitalization = tokenManager.getTokenByAddress(
      "0x116172B2482c5dC3E6f445C16Ac13367aC3FCd35".toUpperCase(),
      "polygon"
    );

    expect(tokenByAddressWithCapitalization).to.eq(tokenByAddress);

    const tokensByAddresses = tokenManager.getTokensByAddresses([
      { address: "0xDb298285FE4C5410B05390cA80e8Fbe9DE1F259B", network: "polygon" },
      { address: "0x116172B2482c5dC3E6f445C16Ac13367aC3FCd35", network: "polygon" }
    ]);

    expect(tokensByAddresses.length).to.eq(2);
  });
  it("Should not add duplciate tokens", async () => {
    const tokenManager = new TokenManager(
      ["https://bridge.arbitrum.io/token-list-42161.json"],
      false,
      false
    );
    await tokenManager.initialLoad;
    const tokenCount = tokenManager.getLoadedTokens().length;
    await tokenManager.fetchTokenLists(["https://bridge.arbitrum.io/token-list-42161.json"]);
    expect(tokenManager.getLoadedTokens().length).to.eq(tokenCount);
  });
});
