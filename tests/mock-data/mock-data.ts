import { ethers } from "ethers";
import { Token } from "../../src";
import { Collateral, CollateralSymbol } from "../../src/types/collaterals";
import { VaultData } from "../../src/types/vaults";

const FOREX_TOKEN_DETAILS: Token<CollateralSymbol> = {
  symbol: "FOREX",
  address: "0xdb298285fe4c5410b05390ca80e8fbe9de1f259b",
  decimals: 18
};

const WETH_TOKEN_DETAILS: Token<CollateralSymbol> = {
  symbol: "WETH",
  address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  decimals: 18
};

const FOREX_COLLATERAL: Collateral = {
  ...FOREX_TOKEN_DETAILS,
  mintCR: ethers.BigNumber.from("500"),
  liquidationFee: ethers.BigNumber.from("1500"),
  interestRate: ethers.BigNumber.from("25"),
  price: ethers.BigNumber.from("31655761573362")
};

const WETH_COLLATERAL: Collateral = {
  ...WETH_TOKEN_DETAILS,
  mintCR: ethers.BigNumber.from("200"),
  liquidationFee: ethers.BigNumber.from("1250"),
  interestRate: ethers.BigNumber.from("25"),
  price: ethers.BigNumber.from("1000000000000000000")
};

export const COLLATERALS: Collateral[] = [FOREX_COLLATERAL, WETH_COLLATERAL];

export const VAULT_DATA: VaultData = {
  account: "0x3e5c9ced70887166612ced5b537fb294dcecb357",
  fxToken: { symbol: "fxAUD", address: "0x7e141940932e3d13bfa54b224cb4a16510519308", decimals: 18 },
  debt: ethers.BigNumber.from("101625547911115216358"),
  collateral: [
    {
      ...FOREX_TOKEN_DETAILS,
      amount: ethers.BigNumber.from("0x00")
    },
    {
      ...WETH_TOKEN_DETAILS,
      amount: ethers.BigNumber.from("45450121610373692")
    }
  ]
};

