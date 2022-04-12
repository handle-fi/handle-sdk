import { expect } from "chai";
import { ethers } from "ethers";
import { vaultUtils, createVault } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockFxToken,
  createMockProtocolParams,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";

const MINIMUM_CR = ethers.BigNumber.from("200");
const MINIMUM_CR_TWO = ethers.BigNumber.from("300");
const ONE_ETH = ethers.constants.WeiPerEther;

const { calculateWithdrawableCollateral } = vaultUtils;

describe("calculateWithdrawableCollateral", () => {
  it("It returns zero when user has no collateral deposited", async () => {
    const [collateral] = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateral],
      [ethers.constants.Zero]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = calculateWithdrawableCollateral(vault, collateral);

    expect(result.isZero()).to.eql(true);
  });

  it("It returns zero when vault's CR equals to minimum CR", async () => {
    const COLLATERAL_PRICE = ONE_ETH;
    const FX_TOKEN_PRICE = ONE_ETH;
    const DEBT = ONE_ETH;
    const COLLATERAL_DEPOSITED = ONE_ETH.mul(2);

    const [collateral] = createMockCollaterals([{ price: COLLATERAL_PRICE, mintCR: MINIMUM_CR }]);
    const fxToken = createMockFxToken({ price: FX_TOKEN_PRICE });

    const vaultData = createMockVaultDataFromMockCollaterals(
      DEBT,
      [collateral],
      [COLLATERAL_DEPOSITED]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    // ensure vault CR == MINIMUM_CR
    expect(
      vault.collateralRatio.eq(MINIMUM_CR.mul(ethers.constants.WeiPerEther).div("100"))
    ).to.eql(true);

    const result = calculateWithdrawableCollateral(vault, collateral);

    expect(result.isZero()).to.eql(true);
  });

  it("It returns zero when vault's CR equals is less than minimum CR", async () => {
    const COLLATERAL_PRICE = ONE_ETH;
    const FX_TOKEN_PRICE = ONE_ETH;
    const DEBT = ONE_ETH;
    const COLLATERAL_DEPOSITED = ONE_ETH;

    const [collateral] = createMockCollaterals([{ price: COLLATERAL_PRICE, mintCR: MINIMUM_CR }]);
    const fxToken = createMockFxToken({ price: FX_TOKEN_PRICE });

    const vaultData = createMockVaultDataFromMockCollaterals(
      DEBT,
      [collateral],
      [COLLATERAL_DEPOSITED]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = calculateWithdrawableCollateral(vault, collateral);

    expect(result.isZero()).to.eql(true);
  });

  it("It returns greater than zero when vault's CR is greater than minimum CR", async () => {
    const COLLATERAL_PRICE = ONE_ETH;
    const FX_TOKEN_PRICE = ONE_ETH;
    const DEBT = ONE_ETH;
    const COLLATERAL_DEPOSITED = ONE_ETH.mul(3);

    const [collateral] = createMockCollaterals([{ price: COLLATERAL_PRICE, mintCR: MINIMUM_CR }]);
    const fxToken = createMockFxToken({ price: FX_TOKEN_PRICE });

    const vaultData = createMockVaultDataFromMockCollaterals(
      DEBT,
      [collateral],
      [COLLATERAL_DEPOSITED]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = calculateWithdrawableCollateral(vault, collateral);

    expect(result.gt(0)).to.eql(true);
  });

  it("It returns deposited collateral when there is no debt", async () => {
    const COLLATERAL_PRICE = ONE_ETH;
    const FX_TOKEN_PRICE = ONE_ETH;
    const DEBT = ethers.constants.Zero;
    const COLLATERAL_DEPOSITED = ONE_ETH;

    const [collateral] = createMockCollaterals([{ price: COLLATERAL_PRICE, mintCR: MINIMUM_CR }]);
    const fxToken = createMockFxToken({ price: FX_TOKEN_PRICE });

    const vaultData = createMockVaultDataFromMockCollaterals(
      DEBT,
      [collateral],
      [COLLATERAL_DEPOSITED]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = calculateWithdrawableCollateral(vault, collateral);

    expect(result.eq(COLLATERAL_DEPOSITED)).to.eql(true);
  });

  it("It returns the correct amount for one collateral", async () => {
    const COLLATERAL_PRICE = ONE_ETH;
    const FX_TOKEN_PRICE = ONE_ETH;
    const DEBT = ONE_ETH;
    const COLLATERAL_DEPOSITED = ONE_ETH.mul(3);
    const EXPECTED = ONE_ETH;

    const [collateral] = createMockCollaterals([{ price: COLLATERAL_PRICE, mintCR: MINIMUM_CR }]);
    const fxToken = createMockFxToken({ price: FX_TOKEN_PRICE });

    const vaultData = createMockVaultDataFromMockCollaterals(
      DEBT,
      [collateral],
      [COLLATERAL_DEPOSITED]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = calculateWithdrawableCollateral(vault, collateral);

    expect(result.eq(EXPECTED)).to.eql(true);
  });

  it("It returns the correct amount for two collaterals", async () => {
    const FX_TOKEN_PRICE = ONE_ETH;
    const DEBT = ONE_ETH;
    const COLLATERAL_DEPOSITED = ONE_ETH.mul(3);
    const EXPECTED = ethers.utils.parseEther("1.75");

    const [collateralOne, collateralTwo] = createMockCollaterals([
      { price: ONE_ETH, mintCR: MINIMUM_CR },
      { price: ONE_ETH, mintCR: MINIMUM_CR_TWO }
    ]);

    const fxToken = createMockFxToken({ price: FX_TOKEN_PRICE });

    const vaultData = createMockVaultDataFromMockCollaterals(
      DEBT,
      [collateralOne, collateralTwo],
      [COLLATERAL_DEPOSITED, COLLATERAL_DEPOSITED]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [
      collateralOne,
      collateralTwo
    ]);

    const result = calculateWithdrawableCollateral(vault, collateralOne);

    expect(result.eq(EXPECTED)).to.eql(true);
  });
});

