import "@nomiclabs/hardhat-ethers";
import "./tasks";

const ARBITRUM_RPC_URL = "https://arb-mainnet.g.alchemy.com/v2/HORad5Nv96-kPzIx9oEPU0tCEiIVp-Oz";

export default {
  paths: {
    tests: "./tests"
  },
  networks: {
    hardhat: {
      chainId: 42161,
      forking: {
        enabled: true,
        url: ARBITRUM_RPC_URL,
        blockNumber: 11545333
      }
    },
    arbitrum: {
      chainid: 42161,
      url: ARBITRUM_RPC_URL,
    }
  },
  mocha: {
    timeout: 1000000,
    delay: true
  }
};
