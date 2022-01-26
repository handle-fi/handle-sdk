import { ethers } from "ethers";
import { ChainId, WNATIVE } from "@sushiswap/core-sdk";
import { SushiKashi__factory } from "../contracts";
import { KashiPoolConfig } from "../config";
import { FxToken } from "../types/fxTokens";

// This file is a simplied version of
// https://github.com/sushiswap/sushiswap-interface/blob/canary/src/entities/KashiCooker.ts

enum Action {
  ADD_ASSET = 1,
  REPAY = 2,
  REMOVE_COLLATERAL = 4,
  BORROW = 5,
  GET_REPAY_PART = 7,
  ADD_COLLATERAL = 10,
  BENTO_DEPOSIT = 20,
  BENTO_WITHDRAW = 21,
  BENTO_SETAPPROVAL = 24
}
export default class KashiCooker {
  private actions: Action[] = [];
  private values: ethers.BigNumber[] = [];
  private datas: string[] = [];
  private useNativeCollateral: boolean;

  constructor(
    private pool: KashiPoolConfig, // add this back in once moved to sdk
    private account: string,
    private fxToken: FxToken,
    private chainId: ChainId
  ) {
    this.useNativeCollateral = pool.collateral.address === WNATIVE[this.chainId].address;
  }

  public addCollateral = (amount: ethers.BigNumber) => {
    // we currently only support depositing collateral from users wallet
    // (dont allow users to use collateral already in Bento Box).
    // SHARE will need to be adjusted when adding the ability to
    // add collateral from Bento Box.
    const SHARE = ethers.BigNumber.from("-2");

    this.addAction(
      Action.BENTO_DEPOSIT,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "int256", "int256"],
        [
          this.useNativeCollateral ? ethers.constants.AddressZero : this.pool.collateral.address,
          this.account,
          amount,
          0
        ]
      ),
      this.useNativeCollateral ? amount : ethers.constants.Zero
    );

    this.addAction(
      Action.ADD_COLLATERAL,
      ethers.utils.defaultAbiCoder.encode(
        ["int256", "address", "bool"],
        [SHARE, this.account, false]
      ),
      ethers.constants.Zero
    );
  };

  public removeCollateral = (share: ethers.BigNumber) => {
    this.addAction(
      Action.REMOVE_COLLATERAL,
      ethers.utils.defaultAbiCoder.encode(["int256", "address"], [share, this.account]),
      ethers.constants.Zero
    );

    this.addAction(
      Action.BENTO_WITHDRAW,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "int256", "int256"],
        [
          this.useNativeCollateral ? ethers.constants.AddressZero : this.pool.collateral.address,
          this.account,
          0,
          share
        ]
      ),
      ethers.constants.Zero
    );
  };

  public borrow = (amount: ethers.BigNumber) => {
    this.addAction(
      Action.BORROW,
      ethers.utils.defaultAbiCoder.encode(["int256", "address"], [amount, this.account]),
      ethers.constants.Zero
    );

    // we currently dont allow the user to keep their borrowed funds in Bento Box
    // To add this functionality make the following conditional.

    this.addAction(
      Action.BENTO_WITHDRAW,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "int256", "int256"],
        [this.fxToken.address, this.account, amount, 0]
      ),
      ethers.constants.Zero
    );
  };

  public repay = (amount: ethers.BigNumber) => {
    // we currently only support depositing collateral from users wallet
    // (dont allow users to use collateral already in Bento Box).

    this.addAction(
      Action.BENTO_DEPOSIT,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "int256", "int256"],
        [this.fxToken.address, this.account, amount, 0]
      ),
      ethers.constants.Zero
    );

    this.addAction(
      Action.GET_REPAY_PART,
      ethers.utils.defaultAbiCoder.encode(["int256"], [-1]),
      ethers.constants.Zero
    );

    this.addAction(
      Action.REPAY,
      ethers.utils.defaultAbiCoder.encode(["int256", "address", "bool"], [-1, this.account, false]),
      ethers.constants.Zero
    );
  };

  public addAsset = (amount: ethers.BigNumber) => {
    this.addAction(
      Action.BENTO_DEPOSIT,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "int256", "int256"],
        [this.fxToken.address, this.account, amount, 0]
      ),
      ethers.constants.Zero
    );

    this.addAction(
      Action.ADD_ASSET,
      ethers.utils.defaultAbiCoder.encode(["int256", "address", "bool"], [-2, this.account, false]),
      ethers.constants.Zero
    );
  };

  approve(signature: ethers.Signature): void {
    this.addAction(
      Action.BENTO_SETAPPROVAL,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "bool", "uint8", "bytes32", "bytes32"],
        [
          this.account,
          "0xB527C5295c4Bc348cBb3a2E96B2494fD292075a7",
          true,
          signature.v,
          signature.r,
          signature.s
        ]
      ),
      ethers.constants.Zero
    );
  }

  public cook = (
    signer: ethers.Signer,
    options?: ethers.Overrides,
    populateTransaction?: boolean
  ) => {
    const kashiPairContract = SushiKashi__factory.connect(this.pool.address, signer);

    const contract = populateTransaction
      ? kashiPairContract.populateTransaction
      : kashiPairContract;

    return contract.cook(this.actions, this.values, this.datas, {
      ...options,
      value: this.values.reduce((sum, next) => sum.add(next), ethers.constants.Zero)
    });
  };

  private addAction = (action: Action, data: string, value: ethers.BigNumber): void => {
    this.actions.push(action);
    this.datas.push(data);
    this.values.push(value);
  };
}
