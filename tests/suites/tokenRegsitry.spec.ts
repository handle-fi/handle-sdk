import { describe, it } from "@jest/globals";
import { getKovanGqlClient } from "../utils";
import {readTokenRegistry} from "../../src/readers/tokenRegistry";
import config from "../../config.json";

const gql = getKovanGqlClient();

describe("Readers: tokenRegistry", () => {
  it("Should return indexed TokenRegistry data", async () => {
    // @ts-ignore
    const handleAddress: string = config.networks
      .find(x => x.name === "kovan")?.handleAddress;
    expect(typeof handleAddress).toBe("string");
    const registry = await readTokenRegistry(gql, handleAddress);
    expect(registry.fxTokens.length).toBeGreaterThan(0);
    expect(registry.collateralTokens.length).toBeGreaterThan(0);
  });
});
