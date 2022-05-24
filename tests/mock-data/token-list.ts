import { exit } from "process";
import { DEFAULT_TOKEN_LIST_URLS } from "../../src/components/TokenManager";
import HandleTokenManager from "../../src/components/TokenManager/HandleTokenManager";
import { loadTokens } from "../suites/convert/test-tokens";

export const testTokenList = new HandleTokenManager(DEFAULT_TOKEN_LIST_URLS);
testTokenList.initialLoad
  .then(() => {
    loadTokens();
    run();
  })
  .catch((e) => {
    console.error(e);
    exit(1);
  });
