import { ethers } from "ethers";
import { CollateralSymbolMap, CollateralSymbol } from "./../types/collaterals";
import { FxTokenSymbolMap, FxTokenSymbol } from "./../types/fxTokens";
import { BridgeConfigByNetwork } from "./../components/Bridge";
import { StableType, Token } from "./../types/tokens";
import { LPStakingPoolNameMap, LPStakingPlatformName } from "./../types/lpStaking";
import { getTokenDetails } from "./../utils/token-utils";

export type FxTokenAddresses = FxTokenSymbolMap<string>;
export type CollateralDetails = CollateralSymbolMap<Omit<Token<CollateralSymbol>, "symbol">>;
export type LPStakingPoolDetails = {
  platform: LPStakingPlatformName;
  title: string;
  stakingContractAddress: string;
  lpToken: {
    symbol: string;
    address: string;
  };
  tokensInLp: Token<string>[];
  url: string;
};

export type KashiPoolConfig = {
  address: string;
  fxToken: FxTokenSymbol;
  collateral: Token<string>;
};

export type SingleCollateralVaults = {
  polygon: { [key: string]: KashiPoolConfig };
  arbitrum: { [key: string]: KashiPoolConfig };
};

export type Config = {
  forexAddress: string;
  fxTokenAddresses: FxTokenAddresses;
  protocol: {
    arbitrum: {
      protocol: ProtocolAddresses;
      chainlinkFeeds: ChainlinkFeeds;
      collaterals: CollateralDetails;
    };
  };
  lpStaking: {
    arbitrum: LPStakingPoolNameMap<LPStakingPoolDetails>;
  };
  theGraphEndpoints: {
    arbitrum: string;
  };
  bridge: {
    apiBaseUrl: string;
    byNetwork: BridgeConfigByNetwork;
  };
  singleCollateralVaults: SingleCollateralVaults;
  singleCollateralVaultParams: {
    minimumMintingRatio: ethers.BigNumber;
    minimumCollateralRatio: ethers.BigNumber;
  };
  convert: {
    feeAddress: string;
    fees: {
      buyingForex: number;
      stableToStable: number; // eur -> usd
      sameStableToStable: number; // usd -> usd
      nonStable: number;
    };
    tokenSymbolToStableType: { [key: string]: StableType };
    gasEstimates: {
      hpsm: number;
      hlp: number;
      weth: number;
    };
  };
};

export type ProtocolAddresses = {
  handle: string;
  vaultLibrary: string;
  comptroller: string;
  treasury: string;
  fxKeeperPool: string;
  governanceLock: string;
  rewardPool: string;
  hPsm?: string;
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
    fxAUD: "0x7E141940932E3D13bfa54B224cb4a16510519308",
    fxPHP: "0x3d147cD9aC957B2a5F968dE9d1c6B9d0872286a0",
    fxUSD: "0x8616E8EA83f048ab9A5eC513c9412Dd2993bcE3F",
    fxEUR: "0x116172B2482c5dC3E6f445C16Ac13367aC3FCd35"
    // fxKRW: "0xF4E8BA79d058fFf263Fd043Ef50e1010c1BdF991",
    // fxCNY: "0x2C29daAce6Aa05e3b65743EFd61f8A2C448302a3"
  },
  protocol: {
    arbitrum: {
      protocol: {
        handle: "0xA112D1bFd43fcFbF2bE2eBFcaebD6B6DB73aaD8B",
        vaultLibrary: "0xeaE0f01393114Dfc95c82AafB227f31ba5ECf886",
        comptroller: "0x140D144480e3eDEB4D1a519997BE1EdF4175BE2D",
        treasury: "0x5710B75A0aA37f4Da939A61bb53c519296627994",
        fxKeeperPool: "0xc55204d4699dCce457DBF63d4B0074E6E1fa4412",
        governanceLock: "0xC6008E6baD8c2c0814A32f6F494fa419E95593b6",
        rewardPool: "0xDE17Af0E4A6c870762508DcB7dCc20719584CBd0",
        hPsm: "0xa2b81201F92b2F3081e9e2900Cf01942e0BCCeD3"
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
        FOREX: {
          address: "0xdb298285fe4c5410b05390ca80e8fbe9de1f259b",
          decimals: 18
        },
        WETH: {
          address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
          decimals: 18
        }
      }
    }
  },
  theGraphEndpoints: {
    arbitrum: "https://api.thegraph.com/subgraphs/name/handle-fi/handle"
  },
  bridge: {
    apiBaseUrl: "https://handle-bridge.herokuapp.com/bridge",
    byNetwork: {
      ethereum: { address: "0xA112D1bFd43fcFbF2bE2eBFcaebD6B6DB73aaD8B", id: 0 },
      arbitrum: { address: "0x000877168981dDc3CA1894c2A8979A2F0C6bBF3a", id: 1 },
      polygon: { address: "0x62E13B35770D40aB0fEC1AB7814d21505620057b", id: 2 }
    }
  },
  lpStaking: {
    arbitrum: {
      sushiWethForex: {
        title: "sushiswap WETH-FOREX",
        platform: "sushi",
        stakingContractAddress: "0x5cdEb8ff5FD3a3361E27e491696515F1D119537a",
        lpToken: {
          address: "0x9745e5CC0522827958eE3Fc2C03247276D359186",
          symbol: "SP-WETH-FOREX"
        },
        tokensInLp: [getTokenDetails("FOREX", "arbitrum"), getTokenDetails("WETH", "arbitrum")],
        url: "https://app.sushi.com/add/ETH/0xDb298285FE4C5410B05390cA80e8Fbe9DE1F259B"
      },
      curveEursFxEUR: {
        title: "curve fxEUR-EURS",
        platform: "curve",
        stakingContractAddress: "0x140b808C0b7e0d24fee45155473042A6f6F841Aa",
        lpToken: {
          address: "0xb0D2EB3C2cA3c6916FAb8DCbf9d9c165649231AE",
          symbol: "CRV-fxEUR-EURS"
        },
        tokensInLp: [
          getTokenDetails("fxEUR", "arbitrum"),
          { symbol: "EURS", decimals: 2, address: "0xD22a58f79e9481D1a88e00c343885A588b34b68B" }
        ],
        url: "https://arbitrum.curve.fi/factory/7/deposit"
      },
      curveHandle3: {
        title: "curve fxUSD-USDC-USDT",
        platform: "curve",
        stakingContractAddress: "0x68F03C9DB2611C79AAa21b6dFcdF6baC0cd191f6",
        lpToken: {
          address: "0xd0dd5d76cf0fc06dabc48632735566dca241a35e",
          symbol: "CRV-handle3"
        },
        tokensInLp: [
          getTokenDetails("fxUSD", "arbitrum"),
          {
            symbol: "2CRV",
            address: "0xbf7e49483881c76487b0989cd7d9a8239b20ca41",
            decimals: 18
          }
        ],
        url: "https://arbitrum.curve.fi/factory/12/deposit"
      }
    }
  },
  singleCollateralVaults: {
    polygon: {
      "fxAUD-WETH": {
        address: "0x78c2b09973363f8111cc122AdAefB1Ae5623feBD",
        fxToken: "fxAUD",
        collateral: getTokenDetails("WETH", "polygon")
      },
      "fxUSD-WMATIC": {
        address: "0xcAd5da38B07CB5dA10d0Cc15783C7a8679Ba0f49",
        fxToken: "fxUSD",
        collateral: getTokenDetails("WMATIC", "polygon")
      }
    },
    arbitrum: {
      "fxAUD-WBTC": {
        address: "0x5b5906ba677f32075b3dd478d730c46eaaa48c3e",
        fxToken: "fxAUD",
        collateral: getTokenDetails("WBTC", "arbitrum")
      }
    }
  },
  singleCollateralVaultParams: {
    minimumMintingRatio: ethers.utils.parseEther("1.75"),
    // https://github.com/sushiswap/sushiswap-interface/blob/master/src/features/kashi/constants.ts
    minimumCollateralRatio: ethers.utils.parseEther("1.33333333333334")
  },
  convert: {
    feeAddress: "0xFa2c1bE677BE4BEc8851D1577B343F7060B51E3A",
    fees: {
      buyingForex: 0,
      stableToStable: 0.1, // eur -> usd
      sameStableToStable: 0.04, // usd -> usd
      nonStable: 0.3
    },
    tokenSymbolToStableType: {
      USDC: "USD",
      LUSD: "USD",
      DAI: "USD",
      USDT: "USD",
      sUSD: "USD",
      EURS: "EURO"
    },
    gasEstimates: {
      hlp: 800_000,
      hpsm: 800_000,
      weth: 500_000
    }
  }
};

export default config;
