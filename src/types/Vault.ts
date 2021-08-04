import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { VaultCollateral } from "./VaultCollateral";
import { SDK } from "./SDK";
import { IndexedVaultData, queryVaults } from "../readers/vault";
import { CollateralTokens, fxTokens } from "./ProtocolTokens";
import { tokenAddressToFxToken } from "./utils";

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
  public redeemableTokens: ethers.BigNumber;
  public ratios: {
    current: ethers.BigNumber;
    minting: ethers.BigNumber;
    /** Always 80% of the minting ratio, or the minimum possible value of 110% */
    liquidation: ethers.BigNumber;
  };

  constructor(account: string, token: fxTokens, sdk: SDK) {
    const fxToken = sdk.protocol.getFxTokenBySymbol(token);
    if (!fxToken) throw new Error(`Invalid fxToken address provided "${token}"`);
    this.sdk = sdk;
    this.token = fxToken;
    this.account = account;
    this.debt = ethers.constants.Zero;
    this.debtAsEth = ethers.constants.Zero;
    this.collateral = [];
    this.collateralAsEth = ethers.constants.Zero;
    this.freeCollateralAsEth = ethers.constants.Zero;
    this.redeemableTokens = ethers.constants.Zero;
    this.ratios = {
      current: ethers.constants.Zero,
      minting: ethers.constants.Zero,
      liquidation: ethers.constants.Zero
    };
  }

  public static async query(sdk: SDK, filter: any): Promise<Vault[]> {
    const vaultData = await queryVaults(sdk.gqlClient, filter);

    return indexedVaultDataToVaults(vaultData, sdk);
  }

  public static async getUsersVaults(account: string, sdk: SDK): Promise<Vault[]> {
    const vaultData = await queryVaults(sdk.gqlClient, {
      where: {
        account: account.toLowerCase()
      }
    });

    return indexedVaultDataToVaults(vaultData, sdk);
  }

  public static async from(account: string, token: fxTokens, sdk: SDK): Promise<Vault> {
    const vault = new Vault(account, token, sdk);
    await vault.update();
    return vault;
  }

  public async update(vaultData?: IndexedVaultData) {
    const data =
      vaultData ||
      (
        await queryVaults(this.sdk.gqlClient, {
          account: this.account,
          fxToken: this.token.address
        })
      )[0];

    // Update debt.
    this.debt = data.debt;
    this.debtAsEth = this.debt.mul(this.token.rate).div(ethers.constants.WeiPerEther);
    // Update collateral tokens.
    this.collateral = [];
    this.collateralAsEth = ethers.BigNumber.from(0);
    this.redeemableTokens = data.redeemableTokens;
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
    this.ratios.current = this.debtAsEth.gt(0)
      ? this.collateralAsEth.mul(ethers.constants.WeiPerEther).div(this.debtAsEth)
      : ethers.constants.Zero;
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
    deadline?: number,
    referral?: string
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");
    const func = !returnTxData
      ? this.sdk.contracts.comptroller
      : this.sdk.contracts.comptroller.populateTransaction;
    return await func.mintWithEth(
      tokenAmount,
      this.token.address,
      getDeadline(deadline),
      referral ?? ethers.constants.AddressZero,
      {
        value: etherAmount,
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );
  }

  /** Mints using an ERC20 as collateral */
  public async mint(
    tokenAmount: ethers.BigNumber,
    collateralToken: CollateralTokens,
    collateralAmount: ethers.BigNumber,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber,
    deadline?: number,
    referral?: string
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");
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
      getDeadline(deadline),
      referral ?? ethers.constants.AddressZero,
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
    deadline?: number,
    referral?: string
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");
    const func = !returnTxData
      ? this.sdk.contracts.comptroller
      : this.sdk.contracts.comptroller.populateTransaction;
    return await func.mintWithoutCollateral(
      tokenAmount,
      this.token.address,
      getDeadline(deadline),
      referral ?? ethers.constants.AddressZero,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );
  }

  public async depositCollateral(
    amount: ethers.BigNumber,
    collateralToken: CollateralTokens,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber,
    referral?: string
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");

    const func = !returnTxData
      ? this.sdk.contracts.treasury
      : this.sdk.contracts.treasury.populateTransaction;

    if (collateralToken === CollateralTokens.WETH) {
      return await func.depositCollateralETH(
        this.account,
        this.token.address,
        referral ?? ethers.constants.AddressZero,
        {
          value: amount,
          gasPrice: gasPrice,
          gasLimit: gasLimit
        }
      );
    }

    const allowance = await this.sdk.contracts[collateralToken].allowance(
      this.account,
      this.sdk.contracts.treasury.address
    );

    if (allowance.lt(amount)) {
      await (
        await this.sdk.contracts[collateralToken].approve(
          this.sdk.contracts.treasury.address,
          amount
        )
      ).wait(2);
    }

    const collateralTokenAddress =
      this.sdk.protocol.getCollateralTokenBySymbol(collateralToken).address;

    return await func.depositCollateral(
      this.account,
      amount,
      collateralTokenAddress,
      this.token.address,
      referral ?? ethers.constants.AddressZero,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );
  }

  public async withdrawCollateral(
    amount: ethers.BigNumber,
    collateralToken: CollateralTokens,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");

    const func = !returnTxData
      ? this.sdk.contracts.treasury
      : this.sdk.contracts.treasury.populateTransaction;

    if (collateralToken === CollateralTokens.WETH) {
      return await func.withdrawCollateralETH(this.account, amount, this.token.address, {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      });
    }
    const collateralTokenAddress =
      this.sdk.protocol.getCollateralTokenBySymbol(collateralToken).address;

    return await func.withdrawCollateral(
      collateralTokenAddress,
      this.account,
      amount,
      this.token.address,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );
  }

  public static async redeem(
    fxToken: fxTokens,
    amount: ethers.BigNumber,
    sdk: SDK,
    referral?: string,
    returnTxData: boolean = false,
    deadline?: number
  ) {
    const accounts: string[] = (await Vault.getRedeemableVaultsForAmount(fxToken, amount, sdk)).map(
      (vault) => vault.account
    );
    if (accounts.length == 0) throw new Error("No vaults available for redemption");
    // @ts-ignore
    const func: ethers.Contract = !returnTxData
      ? sdk.contracts.liquidator
      : sdk.contracts.liquidator.populateTransaction;
    return await func.buyCollateralFromManyVaults(
      amount,
      sdk.protocol.getFxTokenAddress(fxToken),
      accounts,
      getDeadline(deadline),
      referral ?? ethers.constants.AddressZero
    );
  }

  /**
   * Finds an array of redeemable vaults which may be used to redeem up to
   * the redeemableAmount input provided.
   * @param fxToken The vault fxToken
   * @param redeemableAmount The amount to redeem
   * @param sdk The SDK instance
   * @param maxSearchCount The max. number of vaults to find for redemption
   */
  public static async getRedeemableVaultsForAmount(
    fxToken: fxTokens,
    redeemableAmount: ethers.BigNumber,
    sdk: SDK,
    maxSearchCount: number = 100
  ): Promise<Vault[]> {
    const vaults: Vault[] = await Vault.query(sdk, {
      first: maxSearchCount,
      orderBy: "redeemableTokens",
      orderDirection: "asc",
      where: {
        fxToken: sdk.protocol.getFxTokenAddress(fxToken),
        isRedeemable: true
      }
    });
    let redeemableCount = ethers.constants.Zero;
    let redeemableVaults = [];
    for (let vault of vaults) {
      redeemableCount = redeemableCount.add(vault.redeemableTokens);
      redeemableVaults.push(vault);
      if (redeemableCount.gte(redeemableAmount)) break;
    }
    return redeemableVaults;
  }

  public async burn(
    amount: ethers.BigNumber,
    returnTxData: boolean = false,
    gasLimit?: ethers.BigNumber,
    gasPrice?: ethers.BigNumber,
    deadline?: number
  ) {
    if (!this.sdk.signer) throw new Error("This function requires a signer");

    const func = !returnTxData
      ? this.sdk.contracts.comptroller
      : this.sdk.contracts.comptroller.populateTransaction;

    return await func.burn(amount, this.token.address, getDeadline(deadline), {
      gasPrice,
      gasLimit
    });
  }
}

const indexedVaultDataToVaults = async (vaultData: IndexedVaultData[], sdk: SDK) => {
  const vaults = [];

  for (const data of vaultData) {
    const vault = new Vault(data.account, tokenAddressToFxToken(data.fxToken, sdk), sdk);
    await vault.update(data);
    vaults.push(vault);
  }

  return vaults;
};

const getDeadline = (deadline?: number) => deadline ?? Math.floor(Date.now() / 1000) + 300;
