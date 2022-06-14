import "@nomiclabs/hardhat-ethers";
import "./tasks";

export default {
  paths: {
    tests: "./tests"
  },
  networks: {
    hardhat: {
      chainId: 42161,
      forking: {
        enabled: true,
        url: "https://arb-mainnet.g.alchemy.com/v2/HORad5Nv96-kPzIx9oEPU0tCEiIVp-Oz",
        blockNumber: 11545333
      }
    }
  },
  mocha: {
    timeout: 1000000,
    delay: true
  }
};
