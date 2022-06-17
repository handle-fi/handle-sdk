import { BigNumber, ethers } from "ethers";
import { HlpConfig, Network } from "../..";
import { HlpManager__factory } from "../../contracts";
import { Vault__factory } from "../../contracts/factories/Vault__factory";

/**
 * This function aims to do the same as the `HlpManager` contract's `getAum`,
 * but using the oracle server price directly instead of fetching the `Vault` contract's
 * `getMinPrice` or `getMaxPrice`.
 */
export const getAum = async (
  maximise: boolean,
  provider: ethers.providers.Provider | ethers.Signer,
  network: Network,
  getMaxPrice: (address: string) => Promise<BigNumber> | BigNumber,
  getMinPrice: (address: string) => Promise<BigNumber> | BigNumber
): Promise<BigNumber> => {
  const vaultAddress = HlpConfig.HLP_CONTRACTS[network]?.Vault;
  const hlpManagerAddress = HlpConfig.HLP_CONTRACTS[network]?.HlpManager;

  if (!vaultAddress || !hlpManagerAddress) {
    throw new Error("No HLP contract address found for network");
  }

  const vault = Vault__factory.connect(vaultAddress, provider);
  const hlpManager = HlpManager__factory.connect(hlpManagerAddress, provider);

  const [aumAddition, aumDeduction, length] = await Promise.all([
    hlpManager.aumAddition(),
    hlpManager.aumDeduction(),
    vault.allWhitelistedTokensLength()
  ]);

  let aum = aumAddition;
  let shortProfits = ethers.constants.Zero;

  const tokens = await Promise.all(
    new Array(+length).fill(0).map(async (_, i) => {
      const token = await vault.allWhitelistedTokens(i);

      return {
        isWhiteListed: await vault.whitelistedTokens(token),
        price: maximise ? await getMaxPrice(token) : await getMinPrice(token),
        poolAmount: await vault.poolAmounts(token),
        decimals: await vault.tokenDecimals(token),
        isStable: await vault.stableTokens(token),
        size: await vault.globalShortSizes(token),
        averagePrice: await vault.globalShortAveragePrices(token),
        guaranteedUsd: await vault.guaranteedUsd(token),
        reservedAmount: await vault.reservedAmounts(token)
      };
    })
  );

  for (let token of tokens) {
    const {
      isWhiteListed,
      price,
      poolAmount,
      decimals,
      isStable,
      size,
      averagePrice,
      guaranteedUsd,
      reservedAmount
    } = token;

    if (!isWhiteListed) {
      continue;
    }

    if (isStable) {
      aum = aum.add(poolAmount.mul(price).div(BigNumber.from(10).pow(decimals)));
    } else {
      // add global short profit / loss
      if (size.gt(0)) {
        const priceDelta = averagePrice.gt(price)
          ? averagePrice.sub(price)
          : price.sub(averagePrice);
        const delta = size.mul(priceDelta).div(averagePrice);
        if (price > averagePrice) {
          // add losses from shorts
          aum = aum.add(delta);
        } else {
          shortProfits = shortProfits.add(delta);
        }
      }

      aum = aum.add(guaranteedUsd);

      aum = aum.add(
        poolAmount.sub(reservedAmount).mul(price).div(BigNumber.from(10).pow(decimals))
      );
    }
  }

  aum = shortProfits.gt(aum) ? ethers.constants.Zero : aum.sub(shortProfits);
  return aumDeduction.gt(aum) ? ethers.constants.Zero : aum.sub(aumDeduction);
};
