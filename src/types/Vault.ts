import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { VaultCollateral } from "./VaultCollateral";
import { SDK } from "./SDK";
import { readIndexedVaultData } from "../readers/vault";
import { CollateralTokens, fxTokens } from "./ProtocolTokens";

export class Vault {
  private sdk: SDK;
  /** Address for the owner of the vault */
  public account: string;
  public token: fxToken;
  public debt: ethers.BigNumber;
  public debtAsEth: ethers.BigNumber;
  public collateral: VaultCollateral[];
  public collateralAsEth: ethers.BigNumber;
  public freeCollateralAsEth: ethers.BigNumber;
  public ratios: {
    current: ethers.BigNumber;
    minting: ethers.BigNumber;
    /** Always 80% of the minting ratio, or the minimum possible value of 110% */
    liquidation: ethers.BigNumber;
  };

  private constructor(account: string, token: fxTokens, sdk: SDK) {
    const fxToken = sdk.protocol.getFxTokenBySymbol(token);
    if (!fxToken) throw new Error(`Invalid fxToken address provided "${token}"`);
    this.sdk = sdk;
    this.token = fxToken;
    this.account = account;
    this.debt = ethers.BigNumber.from(0);
    this.debtAsEth = ethers.BigNumber.from(0);
    this.collateral = [];
    this.collateralAsEth = ethers.BigNumber.from(0);
    this.freeCollateralAsEth = ethers.BigNumber.from(0);
    this.ratios = {
      current: ethers.BigNumber.from(0),
      minting: ethers.BigNumber.from(0),
      liquidation: ethers.BigNumber.from(0)
    };
  }

  public static async from(account: string, token: fxTokens, sdk: SDK): Promise<Vault> {
    const vault = new Vault(account, token, sdk);
    await vault.update();
    return vault;
  }

  public async update() {
    const data = await readIndexedVaultData(this.account, this.token.address, this.sdk.isKovan);
    // Update debt.
    this.debt = data.debt;
    this.debtAsEth = this.debt.mul(this.token.rate).div(ethers.constants.WeiPerEther);
    // Update collateral tokens.
    this.collateral = [];
    this.collateralAsEth = ethers.BigNumber.from(0);
    for (let token of data.collateralTokens) {
      const collateralToken = this.sdk.protocol.getCollateralTokenByAddress(token.address);
      this.collateral.push({
        token: collateralToken,
        amount: token.amount
      });
      this.collateralAsEth = this.collateralAsEth.add(
        token.amount.mul(collateralToken.rate.div(ethers.constants.WeiPerEther))
      );
    }
    if (this.collateralAsEth.eq(0)) return;
    // Set minting ratio.
    this.ratios.minting = await this.sdk.contracts.vaultLibrary.getMinimumRatio(
      this.account,
      this.token.address
    );
    // Set current and liquidation ratios.
    this.ratios.current = this.collateralAsEth
      .mul(ethers.constants.WeiPerEther)
      .div(this.debtAsEth);
    this.ratios.liquidation = this.ratios.current.mul("80").div("100");
    const minLiquidationRatio = ethers.utils.parseEther("1.1");
    if (this.ratios.liquidation.lt(minLiquidationRatio))
      this.ratios.liquidation = minLiquidationRatio;
  }

  /** Mints using Ether as collateral */
  public async mintWithEth(
    tokenAmount: ethers.BigNumber,
    etherAmount: ethers.BigNumber,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber,
    deadline?: number
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");
    deadline = deadline ?? Math.floor(Date.now() / 1000) + 300;
    const func = !returnTxData
      ? this.sdk.contracts.comptroller
      : this.sdk.contracts.comptroller.populateTransaction;
    return await func.mintWithEth(tokenAmount, this.token.address, deadline, {
      value: etherAmount,
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
  }

  /** Mints using an ERC20 as collateral */
  public async mint(
    tokenAmount: ethers.BigNumber,
    collateralToken: CollateralTokens,
    collateralAmount: ethers.BigNumber,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber,
    deadline?: number
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");
    deadline = deadline ?? Math.floor(Date.now() / 1000) + 300;
    const func = !returnTxData
      ? this.sdk.contracts.comptroller
      : this.sdk.contracts.comptroller.populateTransaction;
    const collateralTokenAddress =
      this.sdk.protocol.getCollateralTokenBySymbol(collateralToken).address;
    return await func.mint(
      tokenAmount,
      this.token.address,
      collateralTokenAddress,
      collateralAmount,
      deadline,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );
  }

  /** Mints with existing vault collateral */
  public async mintWithoutCollateral(
    tokenAmount: ethers.BigNumber,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber,
    deadline?: number
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");
    deadline = deadline ?? Math.floor(Date.now() / 1000) + 300;
    const func = !returnTxData
      ? this.sdk.contracts.comptroller
      : this.sdk.contracts.comptroller.populateTransaction;
    return await func.mintWithoutCollateral(tokenAmount, this.token.address, deadline, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
  }
}
