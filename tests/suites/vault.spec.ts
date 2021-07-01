import { describe, it } from "@jest/globals";
import { SDK } from "../../src/types/SDK";
import { IndexedVaultData, readIndexedVaultData } from "../../src/readers/vault";
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
  it("Should return indexed vault data", async () => {
    const signer = sdk.signer as ethers.Signer;
    const data = (await readIndexedVaultData(
      gql,
      await signer.getAddress(),
      sdk.contracts[fxTokens.fxAUD].address
    )) as IndexedVaultData;
    expect(data).toBeTruthy();
    expect(data.debt.gt(0));
    expect(data.collateralTokens.length > 0);
    expect(data.collateralTokens[0].amount.gt(0));
  });
});
