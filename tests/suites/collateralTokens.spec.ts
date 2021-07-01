import { describe, it } from "@jest/globals";
import { ethers } from "ethers";
import {
  IndexedCollateralTokenData,
  readCollateralTokens
} from "../../src/readers/collateralTokens";
import { getKovanGqlClient } from "../utils";

const gql = getKovanGqlClient();

describe("Readers: collateralTokens", () => {
  it("Should return indexed collateralToken data", async () => {
    const collateralTokens = (await readCollateralTokens(gql)) as IndexedCollateralTokenData[];
    expect(collateralTokens.length > 0);
    for (let collateralToken of collateralTokens) {
      expect(ethers.BigNumber.isBigNumber(collateralToken.mintCollateralRatio));
      expect(ethers.BigNumber.isBigNumber(collateralToken.liquidationFee));
      expect(ethers.BigNumber.isBigNumber(collateralToken.totalBalance));
    }
  });
});
