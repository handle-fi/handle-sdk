import { describe, it } from "@jest/globals";
import { IndexedFxPoolData, queryFxKeeperPools } from "../../src/readers/fxKeeperPool";
import { getKovanGqlClient } from "../utils";
import { fxKeeperPool } from "../../src/types/fxKeeperPool";
import { getSDK } from "../setupTests";
import { SDK } from "../../src/types/SDK";

const gql = getKovanGqlClient();
let sdk: SDK;

describe("fxKeeperPools", () => {
  beforeAll(() => {
    sdk = getSDK();
  });
  describe("reader", () => {
    it("Should return indexed collateralToken data", async () => {
      const collateralTokens = (await queryFxKeeperPools(gql, {})) as IndexedFxPoolData[];
      expect(collateralTokens.length > 0);
    });
  });
  describe("query", () => {
    it("Should return instances of fxKeeperPool", async () => {
      const pools = await fxKeeperPool.query(sdk, {});
      for (const pool of pools) {
        expect(await pool.getPoolTotalDeposit()).toBeTruthy();
      }
    });
  });
});
