import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { queryVaults, queryVault } from "../../src/readers/vault";
import { fxTokens } from "../../src/types/ProtocolTokens";
import { ethers } from "ethers";
import { getSDK } from "../setupTests";
import { getKovanGqlClient } from "../utils";

const gql = getKovanGqlClient();
let sdk: SDK;

describe("Readers: vault", function () {
  beforeAll(() => {
    sdk = getSDK();
  });
  it("Should return a single indexed vault", async () => {
    const signer = sdk.signer as ethers.Signer;
    const data = await queryVault(gql, {
      where: {
        account: (await signer.getAddress()).toLowerCase(),
        fxToken: sdk.contracts[fxTokens.fxAUD].address.toLowerCase()
      }
    });

    // Schema validation.
    expect(data).toBeTruthy();
    expect(data.debt._isBigNumber).toBeTruthy();
    expect(typeof data.collateralTokens.length).toBe("number");
    expect(Array.isArray(data.collateralTokens)).toBeTruthy();
    expect(data.collateralAsEther._isBigNumber).toBeTruthy();
    expect(data.collateralRatio._isBigNumber).toBeTruthy();
    expect(data.minimumRatio._isBigNumber).toBeTruthy();
    expect(data.isLiquidatable).not.toBeNull();
    expect(data.isRedeemable).not.toBeNull();
  });

  it("Should return multiple indexed vaults", async () => {
    const signer = sdk.signer as ethers.Signer;
    const account = (await signer.getAddress()).toLowerCase();
    const fxToken = sdk.contracts[fxTokens.fxAUD].address.toLowerCase();

    const accountVaults = await queryVaults(gql, { where: { account } });
    accountVaults.forEach((v) => expect(v.account).toEqual(account));

    const tokenVaults = await queryVaults(gql, { where: { fxToken } });
    tokenVaults.forEach((v) => expect(v.fxToken).toEqual(fxToken));
  });
});
