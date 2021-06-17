import { describe, it } from "@jest/globals";
import { ethers } from "ethers";
import { IndexedFxlTokenData, readFxTokens } from "../../src/readers/fxTokens";

describe("Readers: fxTokens", () => {
  it("Should return indexed fxToken data", async () => {
    const fxTokens = (await readFxTokens(process.env.NETWORK === "kovan")) as IndexedFxlTokenData[];
    expect(fxTokens.length > 0);
    for (let fxToken of fxTokens) {
      expect(ethers.BigNumber.isBigNumber(fxToken.totalSupply));
    }
  });
});
