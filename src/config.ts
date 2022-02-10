import { ethers } from "ethers";
import { CollateralSymbolMap } from "./types/collaterals";
import { FxTokenSymbolMap, FxTokenSymbol } from "./types/fxTokens";

import { Token } from "./types/general";
import { NetworkMap } from "./types/network";

export type FxTokenAddresses = FxTokenSymbolMap<string>;
export type CollateralAddresses = CollateralSymbolMap<string>;

export type KashiPoolConfig = {
  address: string;
  fxToken: FxTokenSymbol;
  collateral: Token<string>;
};

export type SingleCollateralVaults = {
  polygon: { [key: string]: KashiPoolConfig };
  arbitrum: { [key: string]: KashiPoolConfig };
};

const FX_AUD_ADDRESS = "0x7E141940932E3D13bfa54B224cb4a16510519308";

export type Config = {
  forexAddress: string;
  fxTokenAddresses: FxTokenAddresses;
  protocolAddress: {
    arbitrum: {
      protocol: ProtocolAddresses;
      chainlinkFeeds: ChainlinkFeeds;
      collaterals: CollateralAddresses;
    };
  };
  theGraphEndpoints: {
    arbitrum: string;
  };
  singleCollateralVaults: SingleCollateralVaults;
  networkNameToId: NetworkMap<number>;
  kashiMinimumMintingRatio: ethers.BigNumber;
};

export type ProtocolAddresses = {
  handle: string;
  vaultLibrary: string;
  comptroller: string;
  treasury: string;
};

export type ChainlinkFeeds = {
  eth_usd: string;
  aud_usd: string;
  php_usd: string;
  eur_usd: string;
  krw_usd: string;
  cny_usd: string;
};

const config: Config = {
  forexAddress: "0xDb298285FE4C5410B05390cA80e8Fbe9DE1F259B",
  fxTokenAddresses: {
    fxAUD: FX_AUD_ADDRESS,
    fxPHP: "0x3d147cD9aC957B2a5F968dE9d1c6B9d0872286a0",
    fxUSD: "0x8616E8EA83f048ab9A5eC513c9412Dd2993bcE3F",
    fxEUR: "0x116172B2482c5dC3E6f445C16Ac13367aC3FCd35",
    fxKRW: "0xF4E8BA79d058fFf263Fd043Ef50e1010c1BdF991",
    fxCNY: "0x2C29daAce6Aa05e3b65743EFd61f8A2C448302a3"
  },
  protocolAddress: {
    arbitrum: {
      protocol: {
        handle: "0xA112D1bFd43fcFbF2bE2eBFcaebD6B6DB73aaD8B",
        vaultLibrary: "0xeaE0f01393114Dfc95c82AafB227f31ba5ECf886",
        comptroller: "0x140D144480e3eDEB4D1a519997BE1EdF4175BE2D",
        treasury: "0x5710B75A0aA37f4Da939A61bb53c519296627994"
      },
      chainlinkFeeds: {
        eth_usd: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
        aud_usd: "0x9854e9a850e7c354c1de177ea953a6b1fba8fc22",
        php_usd: "0xff82aaf635645fd0bcc7b619c3f28004cdb58574",
        eur_usd: "0xa14d53bc1f1c0f31b4aa3bd109344e5009051a84",
        krw_usd: "0x85bb02e0ae286600d1c68bb6ce22cc998d411916",
        cny_usd: "0xcc3370bde6afe51e1205a5038947b9836371eccb"
      },
      collaterals: {
        FOREX: "0xdb298285fe4c5410b05390ca80e8fbe9de1f259b",
        WETH: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"
      }
    }
  },
  theGraphEndpoints: {
    arbitrum: "https://api.thegraph.com/subgraphs/name/handle-fi/handle"
  },
  singleCollateralVaults: {
    polygon: {
      "fxAUD-WETH": {
        address: "0x78c2b09973363f8111cc122AdAefB1Ae5623feBD",
        fxToken: "fxAUD",
        collateral: {
          address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
          symbol: "WETH",
          decimals: 18
        }
      }
    },
    arbitrum: {
      "fxAUD-WBTC": {
        address: "0x5b5906ba677f32075b3dd478d730c46eaaa48c3e",
        fxToken: "fxAUD",
        collateral: {
          address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
          symbol: "WBTC",
          decimals: 8
        }
      }
    }
  },
  networkNameToId: {
    ethereum: 1,
    arbitrum: 42161,
    polygon: 137
  },
  kashiMinimumMintingRatio: ethers.utils.parseEther("1.75")
};

export default config;
