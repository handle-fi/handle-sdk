import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { getVault, queryVaults } from "../../src/readers/vault";
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
    const data = await getVault(gql, {
      account: await signer.getAddress(),
      fxToken: sdk.contracts[fxTokens.fxAUD].address
    });

    expect(data).toBeTruthy();
    expect(data.debt.gt(0));
    expect(data.collateralTokens.length > 0);
    expect(data.collateralTokens[0].amount.gt(0));
  });

  it("Should return multiple indexed vaults", async () => {
    const signer = sdk.signer as ethers.Signer;
    const account = await signer.getAddress();
    const fxToken = sdk.contracts[fxTokens.fxAUD].address;

    const accountVaults = await queryVaults(gql, { account });
    accountVaults.forEach((v) => expect(v.account).toEqual(account));

    const tokenVaults = await queryVaults(gql, { fxToken });
    tokenVaults.forEach((v) => expect(v.fxToken).toEqual(fxToken));
  });
});
