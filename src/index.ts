import config, { KashiPoolConfig } from "./config";
import { Vault, SingleCollateralVaultSymbol, SingleCollateralVault } from "./types/vaults";
import { Collateral, CollateralSymbol, CollateralSymbolWithNative } from "./types/collaterals";
import { FxToken } from "./types/fxTokens";
import {
  Network,
  NetworkMap,
  SingleCollateralVaultNetwork,
  SingleCollateralVaultNetworkMap
} from "./types/network";
import { FxKeeperPoolPool } from "./types/fxKeeperPool";
import { GovernanceLockData } from "./types/governanceLock";
import { RewardPoolData, RewardPoolPool } from "./types/rewardPool";
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
import ConvertSDK, { Quote } from "./components/Convert";
import LPStakingSDK from "./components/LPStaking";
import SingleCollateralVaultController from "./components/SingleCollateralVaultController";
import ProtocolSDK, { ProtocolParameters } from "./components/Protocol";
import FxKeeperPoolSDK from "./components/FxKeeperPool";
import GovernanceLockSDK from "./components/GovernanceLock";
import RewardPoolSDK from "./components/RewardPool";
import { getIsKashiApproved, signKashiApproval } from "./utils/allowance-utils";
import { getNetworkName } from "./utils/web3-utils";
import { NETWORK_NAMES, NETWORK_NAME_TO_CHAIN_ID, SECONDS_IN_A_YEAR_BN } from "./constants";
import { vaultUtils } from "./utils/vault-utils";
import * as HlpConfig from "./config/hlp";
import * as TradeUtils from "./components/Trade";
import TokenManager from "./components/TokenManager";
import HandleTokenManager from "./components/TokenManager/HandleTokenManager";
import { TokenInfo, TokenList } from "@uniswap/token-lists";

const SINGLE_COLLATERAL_NETWORK_NAMES = Object.keys(
  config.singleCollateralVaults
) as SingleCollateralVaultNetwork[];

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
  NETWORK_NAME_TO_CHAIN_ID,
  SECONDS_IN_A_YEAR_BN,
  getNetworkName,
  getIsKashiApproved,
  signKashiApproval,
  vaultUtils,
  HlpConfig,
  TradeUtils,
  TokenManager,
  HandleTokenManager
};

export type {
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
  Quote,
  FxKeeperPoolPool,
  GovernanceLockData,
  RewardPoolData,
  RewardPoolPool,
  LPStakingPool,
  LPStakingPoolName,
  LPStakingPoolNameMap,
  LPStakingPlatformName,
  KashiPoolConfig,
  TokenInfo,
  TokenList
};
