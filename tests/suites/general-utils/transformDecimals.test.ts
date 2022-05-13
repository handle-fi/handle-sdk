import { ethers } from "ethers";
import { transformDecimals } from "../../../src/utils/general-utils";
import { expect } from "chai";

describe("transformDecimals", () => {
  it("should be able to transform decimals where the from decimals are lower", () => {
    const value = ethers.BigNumber.from("100");
    const fromDecimals = 2;
    const toDecimals = 18;
    const result = transformDecimals(value, fromDecimals, toDecimals);
    expect(result.toString()).to.equal("1000000000000000000");
  });
  it("should be able to transform decimals where the from decimals are higher", () => {
    const value = ethers.BigNumber.from("1000000000000000000");
    const fromDecimals = 18;
    const toDecimals = 2;
    const result = transformDecimals(value, fromDecimals, toDecimals);
    expect(result.toString()).to.equal("100");
  });
  it("should be able to transform decimals where the from decimals are the same", () => {
    const value = ethers.BigNumber.from("1");
    const fromDecimals = 18;
    const toDecimals = 18;
    const result = transformDecimals(value, fromDecimals, toDecimals);
    expect(result.toString()).to.equal("1");
  });
});
