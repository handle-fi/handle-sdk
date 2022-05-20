import { expect } from "chai";
import { HandleTokenManager, TokenManager } from "../../../src";
import { DEFAULT_TOKEN_LIST_URLS } from "../../../src/components/TokenManager";

describe("Handle Token Manager", () => {
  it("should be able to inherit from a TokenManager", async () => {
    const tokenManager = new TokenManager(undefined, false, false);
    await tokenManager.initialLoad;
    const handleTokenManager = HandleTokenManager.from(tokenManager);
    // expected to be equal to default token list + handle tokens + native tokens
    expect(Object.keys(handleTokenManager.getCache()).length).to.eq(
      DEFAULT_TOKEN_LIST_URLS.length + 2
    );
  });
  it("should be able to get hLP tokens", () => {
    const tokenManager = new HandleTokenManager();
    const hlpTokens = tokenManager.getHlpTokens("arbitrum");
    expect(hlpTokens).to.exist;
    expect(hlpTokens.filter((token) => !token.extensions?.isHlpToken)).to.have.lengthOf(0);
  });
});
