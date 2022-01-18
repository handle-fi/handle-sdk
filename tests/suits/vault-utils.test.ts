import { ethers } from "ethers";
import { expect } from "chai";
import { Collateral } from "../../src/types/collaterals";
import { VaultData } from "../../src/types/vaults";
import {
  calculateCollateralShares,
  calculateLiquidationFee,
  calculateMinimumRatio,
  calculateCollateralAsEth
} from "../../src/utils/vault-utils";
import { sortObjectArrayAlphabetically } from "../utils";

const vault: VaultData = {
  account: "0x3e5c9ced70887166612ced5b537fb294dcecb357",
  fxToken: { symbol: "fxAUD", address: "0x7e141940932e3d13bfa54b224cb4a16510519308" },
  debt: ethers.BigNumber.from("101625547911115216358"),
  collateral: [
    {
      symbol: "FOREX",
      address: "0xdb298285fe4c5410b05390ca80e8fbe9de1f259b",
      amount: ethers.BigNumber.from("0x00")
    },
    {
      symbol: "WETH",
      address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      amount: ethers.BigNumber.from("45450121610373692")
    }
  ]
};

const collaterals: Collateral[] = [
  {
    symbol: "FOREX",
    address: "0xdb298285fe4c5410b05390ca80e8fbe9de1f259b",
    decimals: 18,
    mintCR: ethers.BigNumber.from("500"),
    liquidationFee: ethers.BigNumber.from("1500"),
    interestRate: ethers.BigNumber.from("25"),
    price: ethers.BigNumber.from("31655761573362")
  },
  {
    symbol: "WETH",
    address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    decimals: 18,
    mintCR: ethers.BigNumber.from("200"),
    liquidationFee: ethers.BigNumber.from("1250"),
    interestRate: ethers.BigNumber.from("25"),
    price: ethers.BigNumber.from("1000000000000000000")
  }
];

describe("calculateTotalCollateralBalanceAsEth", () => {
  it("It calculates the correct value for vault one", async () => {
    const totalCollateralBalanceAsEth = calculateCollateralAsEth(vault, collaterals);
    expect(totalCollateralBalanceAsEth.toString()).to.eq("45450121610373692");
  });
});

describe("calculateCollateralShares", () => {
  it("It calculates the correct value for vault one", async () => {
    const EXPECTED = [
      { symbol: "FOREX", share: "0" },
      { symbol: "WETH", share: "1000000000000000000" }
    ];

    const shares = calculateCollateralShares(vault, collaterals);
    const sharesAsString = shares.map((s) => ({ ...s, share: s.share.toString() }));

    expect(sortObjectArrayAlphabetically("symbol", sharesAsString)).to.eql(
      sortObjectArrayAlphabetically("symbol", EXPECTED)
    );
  });
});

describe("calculateMinimumRatio", () => {
  it("It calculates the correct value for vault one", async () => {
    expect(calculateMinimumRatio(vault, collaterals).toString()).to.eq("2000000000000000000");
  });
});

describe("calculateLiquidationFee", () => {
  it("It calculates the correct value for vault one", async () => {
    expect(calculateLiquidationFee(vault, collaterals).toString()).to.eq("125000000000000000");
  });
});
