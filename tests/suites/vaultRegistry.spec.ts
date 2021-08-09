import { describe, it } from "@jest/globals";
import { getKovanGqlClient } from "../utils";
import config from "../../config.json";
import { readVaultRegistry } from "../../src/readers/vaultRegistry";

const gql = getKovanGqlClient();

describe("Readers: vaultRegistry", () => {
  it("Should return indexed VaultRegistry data", async () => {
    // @ts-ignore
    const handleAddress: string = config.networks.find((x) => x.name === "kovan")?.handleAddress;
    expect(typeof handleAddress).toBe("string");
    await readVaultRegistry(gql);
    // expect(registry.owners.length).toBeGreaterThan(0);
  });
});
