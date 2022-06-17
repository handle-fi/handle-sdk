import {
  pairFromString,
} from "../../../src/utils/general-utils";
import { expect } from "chai";
import {fetchEncodedSignedQuotes} from "../../../src/utils/h2so-utils";
import {HandleTokenManager} from "../../../src";

describe("h2so-utils: fetchEncodedSignedQuotes", () => {
  it("should fetch encoded signed quotes for all hLP tokens", async () => {
    const { encoded } = await fetchEncodedSignedQuotes(
      new HandleTokenManager()
        .getHlpTokens("arbitrum")
        .map(({ symbol }) => pairFromString(`${symbol}/USD`))
    );
    expect(encoded.length).to.be.gt(0);
  });
});
