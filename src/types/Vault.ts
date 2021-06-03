import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { VaultCollateral } from "./VaultCollateral";
import { SDK } from "./SDK";

export class Vault {
  /** Address for the owner of the vault */
  public account: string;
  public token: fxToken;
  public debt: ethers.BigNumber;
  public collateral: VaultCollateral[];
  public collateralAsEth: ethers.BigNumber;
  public freeCollateralAsEth: ethers.BigNumber;
  public ratios: {
    current: ethers.BigNumber;
    minting: ethers.BigNumber;
    /** Always 80% of the minting ratio, or the minimum possible value of 110% */
    liquidation: ethers.BigNumber;
  };

  private constructor(account: string, token: string, sdk: SDK) {
    const fxToken = sdk.protocol.fxTokens.find((x) => x.address === token);
    if (!fxToken) throw new Error(`Invalid fxToken address provided "${token}"`);
    this.token = fxToken;
    this.account = account;
    this.debt = ethers.BigNumber.from(0);
    this.collateral = [];
    this.collateralAsEth = ethers.BigNumber.from(0);
    this.freeCollateralAsEth = ethers.BigNumber.from(0);
    this.ratios = {
      current: ethers.BigNumber.from(0),
      minting: ethers.BigNumber.from(0),
      liquidation: ethers.BigNumber.from(0)
    };
  }

  public static async from(account: string, token: string, sdk: SDK): Promise<Vault> {
    const vault = new Vault(account, token, sdk);
    await vault.update();
    return vault;
  }

  public async update() {}
}
