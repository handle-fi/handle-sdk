import { expect } from "chai";
import { ethers } from "ethers";
import { calculateCollateralShares } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";
import { sortObjectArrayAlphabetically } from "../../utils";

describe("calculateCollateralShares", () => {
  it("It calculates the correct values when collaterals have the same price but only one collateral has been deposited", async () => {
    const [collateralOne, collateralTwo] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther },
      { price: ethers.constants.WeiPerEther }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateralOne, collateralTwo],
      [ethers.constants.Zero, ethers.constants.WeiPerEther]
    );

    const EXPECTED = [
      { symbol: collateralOne.symbol, share: "0" },
      { symbol: collateralTwo.symbol, share: ethers.constants.WeiPerEther.toString() }
    ];

    const shares = calculateCollateralShares(vaultData, [collateralOne, collateralTwo]).map(
      (s) => ({ ...s, share: s.share.toString() })
    );

    expect(sortObjectArrayAlphabetically("symbol", shares)).to.eql(
      sortObjectArrayAlphabetically("symbol", EXPECTED)
    );
  });

  it("It calculates the correct values when collaterals have the same price and both collaterals has been deposited", async () => {
    const [collateralOne, collateralTwo] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther },
      { price: ethers.constants.WeiPerEther }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateralOne, collateralTwo],
      [ethers.constants.WeiPerEther, ethers.constants.WeiPerEther]
    );

    const EXPECTED = [
      { symbol: collateralOne.symbol, share: ethers.constants.WeiPerEther.div(2).toString() },
      { symbol: collateralTwo.symbol, share: ethers.constants.WeiPerEther.div(2).toString() }
    ];

    const shares = calculateCollateralShares(vaultData, [collateralOne, collateralTwo]).map(
      (s) => ({ ...s, share: s.share.toString() })
    );

    expect(sortObjectArrayAlphabetically("symbol", shares)).to.eql(
      sortObjectArrayAlphabetically("symbol", EXPECTED)
    );
  });

  it("It calculates the correct values when collaterals have different prices but only one collateral has been deposited", async () => {
    const [collateralOne, collateralTwo] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther.div(2) },
      { price: ethers.constants.WeiPerEther }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateralOne, collateralTwo],
      [ethers.constants.Zero, ethers.constants.WeiPerEther]
    );

    const EXPECTED = [
      { symbol: collateralOne.symbol, share: "0" },
      { symbol: collateralTwo.symbol, share: ethers.constants.WeiPerEther.toString() }
    ];

    const shares = calculateCollateralShares(vaultData, [collateralOne, collateralTwo]).map(
      (s) => ({ ...s, share: s.share.toString() })
    );

    expect(sortObjectArrayAlphabetically("symbol", shares)).to.eql(
      sortObjectArrayAlphabetically("symbol", EXPECTED)
    );
  });

  it("It calculates the correct values when collaterals have different prices and both collaterals has been deposited", async () => {
    const [collateralOne, collateralTwo] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther.div(2) },
      { price: ethers.constants.WeiPerEther }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateralOne, collateralTwo],
      [ethers.constants.WeiPerEther, ethers.constants.WeiPerEther]
    );

    const EXPECTED = [
      { symbol: collateralOne.symbol, share: ethers.constants.WeiPerEther.div(3).toString() },
      { symbol: collateralTwo.symbol, share: ethers.constants.WeiPerEther.div(3).mul(2).toString() }
    ];

    const shares = calculateCollateralShares(vaultData, [collateralOne, collateralTwo]).map(
      (s) => ({ ...s, share: s.share.toString() })
    );

    expect(sortObjectArrayAlphabetically("symbol", shares)).to.eql(
      sortObjectArrayAlphabetically("symbol", EXPECTED)
    );
  });
});

