import "@nomiclabs/hardhat-ethers";

export default {
  paths: {
    tests: "./tests"
  },
  hardhat: {
    chainId: 42161,
    forking: {
      url: "https://arb-mainnet.g.alchemy.com/v2/HORad5Nv96-kPzIx9oEPU0tCEiIVp-Oz",
    },
  },
};
