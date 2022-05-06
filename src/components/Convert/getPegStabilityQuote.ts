import { BigNumber, ethers, providers, Signer } from "ethers";
import { HlpConfig } from "../..";
import { PSM_GAS_LIMIT } from "../../config/hlp";
import { HPSM__factory } from "../../contracts/factories/HPSM__factory";
import { Network } from "../../types/network";
import { Quote } from "./Convert";

let transactionFeeCache: Record<Network, BigNumber | null> = {
  arbitrum: null,
  ethereum: null,
  polygon: null
};

const TRANSACTION_FEE_UNIT = ethers.utils.parseEther("1");

export const getPegStabilityQuote = async ({
  network,
  fromAmount,
  provider
}: {
  fromToken: string;
  toToken: string;
  network: Network;
  fromAmount: BigNumber;
  provider: providers.Provider | Signer;
}): Promise<{ quote: Quote; feeBasisPoints?: BigNumber }> => {
  const hpsmAddress = HlpConfig.HLP_CONTRACTS[network]?.HPSM;
  if (!hpsmAddress) {
    throw new Error("No HPSM for network '" + network + "'");
  }
  if (!transactionFeeCache[network]) {
    const hpsm = HPSM__factory.connect(hpsmAddress, provider);
    transactionFeeCache[network] = await hpsm.transactionFee();
  }
  // convert transaction fee to basis points
  const transactionFeeBasisPoints = transactionFeeCache[network]!.mul(
    HlpConfig.BASIS_POINTS_DIVISOR
  ).div(TRANSACTION_FEE_UNIT);
  const quote: Quote = {
    allowanceTarget: hpsmAddress,
    buyAmount: fromAmount.toString(),
    sellAmount: fromAmount.toString(),
    gas: PSM_GAS_LIMIT
  };
  return { quote, feeBasisPoints: transactionFeeBasisPoints };
};
