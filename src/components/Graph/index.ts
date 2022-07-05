import config from "../../config";
import { GraphQLClient } from "graphql-request/dist";
import FxTokenGraphClient, { IndexedFxToken } from "./clients/FxTokenGraphClient";
import VaultGraphClient, { IndexedVault } from "./clients/VaultGraphClient";
import FxKeeperPoolGraphClient, { IndexedFxKeeperPool } from "./clients/FxKeeperPoolGraphClient";
import CollateralGraphClient, { IndexedCollateral } from "./clients/CollateralGraphClient";
import { NETWORK_NAME_TO_CHAIN_ID } from "../..";

const graphNetwork = "arbitrum";

export default class Graph {
  public fxTokens: FxTokenGraphClient;
  public vaults: VaultGraphClient;
  public fxKeeperPools: FxKeeperPoolGraphClient;
  public collateralGraphClient: CollateralGraphClient;

  constructor(endpoint?: string) {
    const url = endpoint || config.theGraphEndpoints[graphNetwork].handle;
    const client = new GraphQLClient(url);

    this.fxTokens = new FxTokenGraphClient(client);
    this.vaults = new VaultGraphClient(client, this.fxTokens);
    this.fxKeeperPools = new FxKeeperPoolGraphClient(client);
    this.collateralGraphClient = new CollateralGraphClient(
      client,
      NETWORK_NAME_TO_CHAIN_ID[graphNetwork]
    );
  }
}

export type { IndexedFxToken, IndexedVault, IndexedFxKeeperPool, IndexedCollateral };
