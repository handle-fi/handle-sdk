import config from "./config";
import { FxTokenSymbol, FxTokenSymbolMap } from "./types/fxTokens";
import { Vault, SingleCollateralVaultSymbol, SingleCollateralVault } from "./types/vaults";
import { Collateral, CollateralSymbol, CollateralSymbolWithNative } from "./types/collaterals";
import { FxToken } from "./types/fxTokens";
import { Network, NetworkMap, SingleCollateralVaultNetwork } from "./types/web3";
import FxTokensSDK from "./components/FxTokens";
import PricesSDK, { Price } from "./components/Prices";
import VaultsSDK from "./components/Vaults";
import CollateralsSDK from "./components/Collaterals";
import GraphSDK, { IndexedFxToken, IndexedVault, IndexedFxKeeperPool } from "./components/Graph";
import VaultController from "./components/VaultController";
import SingleCollateralVaultController from "./components/SingleCollateralVaultController";
import ProtocolSDK, { ProtocolParameters } from "./components/Protocol";
import { getIsKashiApproved, signKashiApproval } from "./utils/allowance-utils";
import { getNetworkName } from "./utils/web3-utils";

export {
  FxTokensSDK,
  PricesSDK,
  VaultsSDK,
  CollateralsSDK,
  GraphSDK,
  VaultController,
  SingleCollateralVaultController,
  ProtocolSDK,
  config,
  getNetworkName,
  getIsKashiApproved,
  signKashiApproval
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
  ProtocolParameters,
  Network,
  NetworkMap,
  SingleCollateralVaultNetwork,
  SingleCollateralVaultSymbol,
  SingleCollateralVault
};
