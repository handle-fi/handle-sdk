import { queryCollateralTokens } from "./collateralTokens";
import { queryFxKeeperPools } from "./fxKeeperPool";
import { queryFxTokens } from "./fxTokens";
import { readTokenRegistry } from "./tokenRegistry";
import { readVaultRegistry } from "./vaultRegistry";
import { queryVault } from "./vault";

export default {
  queryCollateralTokens,
  queryFxKeeperPools,
  queryFxTokens,
  readTokenRegistry,
  readVaultRegistry,
  queryVault
};
