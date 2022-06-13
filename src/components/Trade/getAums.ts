import { BigNumber, ethers } from "ethers"
import { HlpConfig } from "../..";
import { Vault__factory } from "../../contracts/factories/Vault__factory";

export const getAum = (maximise: boolean, provider: ethers.providers.Provider | ethers.Signer): BigNumber => {

    const vault = Vault__factory.connect(HlpConfig.HLP_CONTRACTS["arbitrum"]?.Vault!, provider)

    const length = vault.allWhitelistedTokensLength();
    let aum = aumAddition;
    const shortProfits = 0;

    for (let i = 0; i < length; i++) {
        const token = vault.allWhitelistedTokens(i);
        const isWhitelisted = vault.whitelistedTokens(token);

        if (!isWhitelisted) {
            continue;
        }

        const price = maximise
            ? vault.getMaxPrice(token)
            : vault.getMinPrice(token);
        const poolAmount = vault.poolAmounts(token);
        const decimals = vault.tokenDecimals(token);

        if (vault.stableTokens(token)) {
            aum = aum.add(poolAmount.mul(price).div(10 ** decimals));
        } else {
            // add global short profit / loss
            const size = vault.globalShortSizes(token);
            if (size > 0) {
                const averagePrice = vault.globalShortAveragePrices(
                    token
                );
                const priceDelta = averagePrice > price
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

            aum = aum.add(vault.guaranteedUsd(token));

            const reservedAmount = vault.reservedAmounts(token);
            aum = aum.add(
                poolAmount.sub(reservedAmount).mul(price).div(10 ** decimals)
            );
        }
    }