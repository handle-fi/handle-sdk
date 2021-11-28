import { ethers } from "ethers";
import { CollateralToken } from "./CollateralToken";
import { SDK } from "./SDK";
import { fxTokens } from "./ProtocolTokens";
import { queryFxKeeperPools } from "../readers/fxKeeperPool";
import { tokenAddressToFxToken } from "./utils";

/**
 * Class to interact with a fxKeeperPool for a specific fxToken.
 * The fxKeeperPool is a single contract, but each function requires an
 * input fxToken to perform the action for. This class fills the fxToken
 * parameters with the instance token.
 */
export class fxKeeperPool {
  public contract: ethers.Contract;
  /** fxToken contract */
  private erc20: ethers.Contract;
  public token: string;

  /**
   * @param sdk The SDK instance.
   * @param token The pool fxToken address.
   * @param contract The keeper pool contract instance.
   */
  public constructor(sdk: SDK, token: fxTokens, contract: ethers.Contract) {
    this.erc20 = sdk.contracts[token];
    this.token = this.erc20.address;
    this.contract = contract;
  }

  /**
   * Sets allowance to pool fxToken if needed.
   * Requires erc20 contract to be connected to signer.
   */
  private async ensureAllowance(amount: ethers.BigNumber) {
    const allowance: ethers.BigNumber = await this.erc20.allowance(
      await this.erc20.signer.getAddress(),
      this.contract.address
    );
    if (allowance.gte(amount)) return;
    await (await this.erc20.approve(this.contract.address, ethers.constants.MaxUint256)).wait(1);
  }

  public async stake(amount: ethers.BigNumber, referral?: string) {
    if (amount.lt(0)) throw new Error("Amount must be greater than 0");
    await this.ensureAllowance(amount);
    return await this.contract.stake(amount, this.token, referral ?? ethers.constants.AddressZero);
  }

  public async unstake(amount: ethers.BigNumber) {
    if (amount.lt(0)) throw new Error("Amount must be greater than 0");
    return await this.contract.unstake(amount, this.token);
  }

  public async withdrawCollateralReward() {
    return await this.contract.withdrawCollateralReward(this.token);
  }

  public async balanceOfStake(account: string): Promise<ethers.BigNumber> {
    return await this.contract.balanceOfStake(account, this.token);
  }

  public async balanceOfRewards(account: string): Promise<ethers.BigNumber> {
    return await this.contract.balanceOfRewards(account, this.token);
  }

  public async shareOf(account: string): Promise<ethers.BigNumber> {
    return await this.contract.shareOf(account, this.token);
  }

  public async liquidate(account: string) {
    return await this.contract.liquidate(account, this.token);
  }

  public async getPoolCollateralBalance(collateral: CollateralToken): Promise<ethers.BigNumber> {
    return await this.contract.getPoolCollateralBalance(this.token, collateral.address);
  }

  public async getPoolTotalDeposit(): Promise<ethers.BigNumber> {
    return await this.contract.getPoolTotalDeposit(this.token);
  }

  public static async query(sdk: SDK, filter: any): Promise<fxKeeperPool[]> {
    const indexedData = await queryFxKeeperPools(sdk.gqlClient, filter);

    return indexedData.map(
      (id) =>
        new fxKeeperPool(sdk, tokenAddressToFxToken(id.fxToken, sdk), sdk.contracts.fxKeeperPool)
    );
  }
}
