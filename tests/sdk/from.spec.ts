import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { getSigner } from "../setupTests";

let sdk: SDK;

describe("SDK: from", () => {
  it("Should create new SDK", async () => {
    // @ts-ignore
    sdk = await SDK.from(getSigner());
    expect(sdk.protocol.fxTokens.length).toEqual(0);
  });
});
