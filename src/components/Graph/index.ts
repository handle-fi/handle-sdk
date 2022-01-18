import config from "../../config";
import { GraphQLClient } from "graphql-request/dist";
import FxTokenGraphClient, { IndexedFxToken } from "./clients/FxTokenGraphClient";
import VaultGraphClient, { IndexedVault } from "./clients/VaultGraphClient";
import FxKeeperPoolGraphClient, { IndexedFxKeeperPool } from "./clients/FxKeeperPoolGraphClient";
import CollateralGraphClient, { IndexedCollateral } from "./clients/CollateralGraphClient";

export default class Graph {
  public fxTokens: FxTokenGraphClient;
  public vaults: VaultGraphClient;
  public fxKeeperPools: FxKeeperPoolGraphClient;
  public collateralGraphClient: CollateralGraphClient;

  constructor(endpoint?: string) {
    const url = endpoint || config.byNetwork.arbitrum.theGraphEndpoint;
    const client = new GraphQLClient(url);

    this.fxTokens = new FxTokenGraphClient(client);
    this.vaults = new VaultGraphClient(client, this.fxTokens);
    this.fxKeeperPools = new FxKeeperPoolGraphClient(client);
    this.collateralGraphClient = new CollateralGraphClient(client);
  }
}

export type { IndexedFxToken, IndexedVault, IndexedFxKeeperPool, IndexedCollateral };
