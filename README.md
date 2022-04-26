# handle.fi SDK

Read the docs [here](https://github.com/handle-fi/handle-sdk/tree/master/docs).  
Please note that this SDK is a work in progress until version 1.0.0.
The handle.fi protocol is deployed on Arbitrum One.

## Getting started

Install the package with yarn or NPM:

```
npm install --save handle-sdk
yarn add handle-sdk
```

Initialise the SDK with an [ethers](https://www.npmjs.com/package/ethers) `Signer` or `Provider`:

```js
signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  new ethers.providers.InfuraWebSocketProvider("kovan", process.env.INFURA_KEY)
);
// Load the SDK.
const handleSDK = await SDK.from(signer);
// Load user vaults.
await handleSDK.loadVaults();
```

Mint some `fxAUD` using Ether as collateral:

```js
const vault = handleSDK.vaults.find((x) => x.token.symbol === "fxAUD");
await vault.mintWithEth(
  ethers.utils.parseEther("0.01"), // 1 cent of fxAUD
  ethers.utils.parseEther("0.0003") // approximately 1 AUD in Ether
);
```
