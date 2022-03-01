import config from "./config";
import { FxTokenSymbol, FxTokenSymbolMap } from "./types/fxTokens";
import { Vault, SingleCollateralVaultSymbol, SingleCollateralVault } from "./types/vaults";
import { Collateral, CollateralSymbol, CollateralSymbolWithNative } from "./types/collaterals";
import { FxToken } from "./types/fxTokens";
import { Token, TokenExtended } from "./types/tokens";
import {
  Network,
  NetworkMap,
  SingleCollateralVaultNetwork,
  SingleCollateralVaultNetworkMap
} from "./types/network";
import { FxKeeperPoolPool } from "./types/fxKeeperPool";
import { GovernanceLockData } from "./types/governanceLock";
import {
  RewardPoolData,
  RewardPoolNameMap,
  RewardPoolPool,
  RewardPoolName
} from "./types/rewardPool";
import {
  LPStakingPool,
  LPStakingPoolName,
  LPStakingPoolNameMap,
  LPStakingPlatformName
} from "./types/lpStaking";
import FxTokensSDK from "./components/FxTokens";
import PricesSDK, { Price } from "./components/Prices";
import VaultsSDK from "./components/Vaults";
import CollateralsSDK from "./components/Collaterals";
import GraphSDK, { IndexedFxToken, IndexedVault, IndexedFxKeeperPool } from "./components/Graph";
import BridgeSDK, { PendingWithdrawal } from "./components/Bridge";
import VaultController from "./components/VaultController";
import ConvertSDK, { Quote, Swap } from "./components/Convert";
import LPStakingSDK from "./components/LPStaking";
import SingleCollateralVaultController from "./components/SingleCollateralVaultController";
import ProtocolSDK, { ProtocolParameters } from "./components/Protocol";
import FxKeeperPoolSDK from "./components/FxKeeperPool";
import GovernanceLockSDK from "./components/GovernanceLock";
import RewardPoolSDK from "./components/RewardPool";
import { getIsKashiApproved, signKashiApproval } from "./utils/allowance-utils";
import { getNetworkName } from "./utils/web3-utils";
import { NETWORK_NAMES, SINGLE_COLLATERAL_NETWORK_NAMES } from "./constants";
import ethereumTokenList from "./data/tokens/ethereum-tokens.json";
import arbitrumTokenList from "./data/tokens/arbitrum-tokens.json";
import polygonTokenList from "./data/tokens/polygon-tokens.json";

const ETHEREUM_TOKEN_LIST = ethereumTokenList as TokenExtended<string>[];
const ARBITRUM_TOKEN_LIST = arbitrumTokenList as TokenExtended<string>[];
const POLYGON_TOKEN_LIST = polygonTokenList as TokenExtended<string>[];

export {
  FxTokensSDK,
  PricesSDK,
  VaultsSDK,
  CollateralsSDK,
  GraphSDK,
  VaultController,
  SingleCollateralVaultController,
  ProtocolSDK,
  BridgeSDK,
  ConvertSDK,
  FxKeeperPoolSDK,
  GovernanceLockSDK,
  RewardPoolSDK,
  LPStakingSDK,
  config,
  NETWORK_NAMES,
  SINGLE_COLLATERAL_NETWORK_NAMES,
  ETHEREUM_TOKEN_LIST,
  ARBITRUM_TOKEN_LIST,
  POLYGON_TOKEN_LIST,
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
  SingleCollateralVaultNetworkMap,
  SingleCollateralVaultNetwork,
  SingleCollateralVaultSymbol,
  SingleCollateralVault,
  PendingWithdrawal,
  Token,
  TokenExtended,
  Quote,
  Swap,
  FxKeeperPoolPool,
  GovernanceLockData,
  RewardPoolData,
  RewardPoolNameMap,
  RewardPoolPool,
  RewardPoolName,
  LPStakingPool,
  LPStakingPoolName,
  LPStakingPoolNameMap,
  LPStakingPlatformName
};
