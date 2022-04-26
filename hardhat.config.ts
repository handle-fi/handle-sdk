import "@nomiclabs/hardhat-ethers";

export default {
  networks: {
    hardhat: {
      chainId: 42161,
      forking: {
        url: "https://arb-mainnet.g.alchemy.com/v2/HORad5Nv96-kPzIx9oEPU0tCEiIVp-Oz",
        blockNumber: 10557296
      }
    }
  }
};
