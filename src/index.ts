import config from "./config";
import { FxTokenSymbol, FxTokenSymbolMap } from "./types/fxTokens";
import { Vault } from "./types/vaults";
import { Collateral, CollateralSymbol, CollateralSymbolWithNative } from "./types/collaterals";
import { FxToken } from "./types/fxTokens";
import FxTokensSDK from "./components/FxTokens";
import PricesSDK, { Price } from "./components/Prices";
import VaultsSDK from "./components/Vaults";
import CollateralsSDK from "./components/Collaterals";
import GraphSDK, { IndexedFxToken, IndexedVault, IndexedFxKeeperPool } from "./components/Graph";
import VaultController from "./components/VaultController";
import ProtocolSDK, { ProtocolParameters } from "./components/Protocol";

// utils
import { getNetworkName } from "./utils/web3-utils";

export {
  FxTokensSDK,
  PricesSDK,
  VaultsSDK,
  CollateralsSDK,
  GraphSDK,
  VaultController,
  ProtocolSDK,
  config,
  getNetworkName
};

export type {
  FxTokenSymbol,
  FxTokenSymbolMap,
  IndexedFxToken,
  IndexedVault,
  IndexedFxKeeperPool,
  Vault,
  Collateral,
  CollateralSymbol,
  CollateralSymbolWithNative,
  FxToken,
  Price,
  ProtocolParameters
};
