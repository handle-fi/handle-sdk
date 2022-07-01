import "@nomiclabs/hardhat-ethers";
import "./tasks";
import "dotenv/config";

const ARBITRUM_RPC_URL = process.env.ARBITRUM_URL ?? "https://arb1.arbitrum.io/rpc";

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
      url: ARBITRUM_RPC_URL
    }
  },
  mocha: {
    timeout: 1000000,
    delay: true
  }
};
