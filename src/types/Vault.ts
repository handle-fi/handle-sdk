import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { VaultCollateral } from "./VaultCollateral";

export type Vault = {
  /** Address for the owner of the vault */
  account: string,
  token: fxToken,
  debt: ethers.BigNumber,
  collateral: VaultCollateral[],
  collateralAsEth: ethers.BigNumber,
  freeCollateralAsEth: ethers.BigNumber,
  ratios: {
    current: ethers.BigNumber,
    minting: ethers.BigNumber,
    /** Always 80% of the minting ratio, or the minimum possible value of 110% */
    liquidation: ethers.BigNumber
  }
};
