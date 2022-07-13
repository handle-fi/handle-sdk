import { ethers } from "ethers";
import { CollateralSymbolMap } from "./../types/collaterals";
import { BridgeConfigByNetwork } from "./../components/Bridge";
import { StableType } from "./../types/tokens";
import { LPStakingPoolNameMap, LPStakingPlatformName } from "./../types/lpStaking";
import { TokenInfo } from "@uniswap/token-lists";
import StakingTokens from "./TokenLists/staking-tokens.json";
import HandleTokens from "./TokenLists/handle-tokens.json";
import { validateTokenList, getTokenFromTokenList } from "../utils/tokenlist-utils";
import { mustExist } from "../utils/general-utils";

const stakingTokens = validateTokenList(StakingTokens);
const handleTokens = validateTokenList(HandleTokens);

export type FxTokenAddresses = Record<string, string>;
export type CollateralDetails = CollateralSymbolMap<{ address: string; decimals: number }>;
export type LPStakingPoolDetails = {
  platform: LPStakingPlatformName;
  title: string;
  stakingContractAddress: string;
  factoryAddress?: string;
  lpToken: {
    symbol: string;
    address: string;
  };
  tokensInLp: TokenInfo[];
  url: string;
};

export type KashiPoolConfig = {
  address: string;
  fxToken: string;
  collateral: TokenInfo;
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
    ethereum: null;
    polygon: null;
  };
  lpStaking: {
    arbitrum: LPStakingPoolNameMap<LPStakingPoolDetails>;
  };
  theGraphEndpoints: {
    arbitrum: {
      fx: string;
      hpsm: string;
    };
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
      hpsmToHlp: number;
      hlp: number;
      weth: number;
      hpsmToHlpToCurve: number;
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
  hpsm: string;
  routerHpsmHlp: string;
  routerHpsmHlpCurve: string;
};

export type ChainlinkFeeds = {
  eth_usd: string;
  aud_usd: string;
  php_usd: string;
  eur_usd: string;
  krw_usd: string;
  cny_usd: string;
  chf_usd: string;
};

export const DATA_FEED_API_BASE_URL = "https://oracle.handle.fi";
export const DATA_FEED_SIGNING_ADDRESS = "0xfff98D80aCC2CE312225e08eb9fA88F19D737577";

const forexAddress = mustExist(
  getTokenFromTokenList(handleTokens, "FOREX", "arbitrum"),
  "FOREX on arbitrum"
).address;

const config: Config = {
  forexAddress: forexAddress,
  fxTokenAddresses: handleTokens.tokens.reduce((acc: any, token: any) => {
    if (!token.extensions?.isFxToken) return acc;
    return {
      ...acc,
      [token.symbol]: token.address
    };
  }, {}) as FxTokenAddresses,
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
        hpsm: "0xa2b81201F92b2F3081e9e2900Cf01942e0BCCeD3",
        routerHpsmHlp: "0x69328f23A090e57378e3120f622ed0697f0E7ECF",
        routerHpsmHlpCurve: "0xaCb14b0e3a798992f809e9c46ED10e1111B64994"
      },
      chainlinkFeeds: {
        eth_usd: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
        aud_usd: "0x9854e9a850e7c354c1de177ea953a6b1fba8fc22",
        php_usd: "0xff82aaf635645fd0bcc7b619c3f28004cdb58574",
        eur_usd: "0xa14d53bc1f1c0f31b4aa3bd109344e5009051a84",
        krw_usd: "0x85bb02e0ae286600d1c68bb6ce22cc998d411916",
        cny_usd: "0xcc3370bde6afe51e1205a5038947b9836371eccb",
        chf_usd: "0xe32accc8c4ec03f6e75bd3621bfc9fbb234e1fc3"
      },
      collaterals: {
        FOREX: {
          address: forexAddress,
          decimals: 18
        },
        WETH: {
          address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
          decimals: 18
        }
      }
    },
    ethereum: null,
    polygon: null
  },
  theGraphEndpoints: {
    arbitrum: {
      fx: "https://api.thegraph.com/subgraphs/name/handle-fi/handle",
      hpsm: "https://api.thegraph.com/subgraphs/name/handle-fi/handle-psm"
    }
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
        factoryAddress: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
        lpToken: {
          address: "0x9745e5CC0522827958eE3Fc2C03247276D359186",
          symbol: "SP-WETH-FOREX"
        },
        tokensInLp: [
          mustExist(getTokenFromTokenList(handleTokens, "FOREX", "arbitrum"), "FOREX on arbitrum"),
          mustExist(getTokenFromTokenList(handleTokens, "WETH", "arbitrum"), "WETH on arbitrum")
        ],
        url: "https://app.sushi.com/add/ETH/0xDb298285FE4C5410B05390cA80e8Fbe9DE1F259B"
      },
      curveEursFxEUR: {
        title: "curve fxEUR-EURS",
        platform: "curve",
        factoryAddress: "0xb17b674D9c5CB2e441F8e196a2f048A81355d031",
        stakingContractAddress: "0x140b808C0b7e0d24fee45155473042A6f6F841Aa",
        lpToken: {
          address: "0xb0D2EB3C2cA3c6916FAb8DCbf9d9c165649231AE",
          symbol: "CRV-fxEUR-EURS"
        },
        tokensInLp: [
          mustExist(getTokenFromTokenList(handleTokens, "fxEUR", "arbitrum"), "fxEUR on arbitrum"),
          mustExist(getTokenFromTokenList(stakingTokens, "EURS", "arbitrum"), "EURS on arbitrum")
        ],
        url: "https://arbitrum.curve.fi/factory/7/deposit"
      },
      curveHandle3: {
        title: "curve fxUSD-USDC-USDT",
        platform: "curve",
        stakingContractAddress: "0x68F03C9DB2611C79AAa21b6dFcdF6baC0cd191f6",
        factoryAddress: "0xb17b674D9c5CB2e441F8e196a2f048A81355d031",
        lpToken: {
          address: "0xd0dd5d76cf0fc06dabc48632735566dca241a35e",
          symbol: "CRV-handle3"
        },
        tokensInLp: [
          mustExist(getTokenFromTokenList(handleTokens, "fxUSD", "arbitrum"), "fxUSD on arbitrum"),
          mustExist(getTokenFromTokenList(stakingTokens, "2CRV", "arbitrum"), "2CRV on arbitrum")
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
        collateral: mustExist(
          getTokenFromTokenList(stakingTokens, "WETH", "polygon"),
          "WETH on polygon"
        )
      },
      "fxUSD-WMATIC": {
        address: "0xcAd5da38B07CB5dA10d0Cc15783C7a8679Ba0f49",
        fxToken: "fxUSD",
        collateral: mustExist(
          getTokenFromTokenList(stakingTokens, "WMATIC", "polygon"),
          "WMATIC on polygon"
        )
      }
    },
    arbitrum: {
      "fxAUD-WBTC": {
        address: "0x5b5906ba677f32075b3dd478d730c46eaaa48c3e",
        fxToken: "fxAUD",
        collateral: mustExist(
          getTokenFromTokenList(stakingTokens, "WBTC", "arbitrum"),
          "WBTC on arbitrum"
        )
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
      hpsmToHlp: 1_600_000,
      hpsmToHlpToCurve: 2_000_000,
      weth: 500_000
    }
  }
};

export default config;
