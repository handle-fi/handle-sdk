import { BigNumber, ethers, providers, Signer } from "ethers";
import { HlpConfig, Network } from "../..";
import { HPSM__factory } from "../../contracts/factories/HPSM__factory";
import { isTokenPegged } from "./isTokenPegged";

export const getPegStabilityTransaction = async ({
  fromToken,
  toToken,
  fromAmount,
  network,
  signer
}: {
  fromToken: string;
  toToken: string;
  fromAmount: BigNumber;
  network: Network;
  signer: Signer | providers.Provider;
}): Promise<ethers.PopulatedTransaction> => {
  const hpsmAddress = HlpConfig.HLP_CONTRACTS[network]?.HPSM;
  if (!hpsmAddress) {
    throw new Error("No HPSM for network '" + network + "'");
  }
  const hpsm = HPSM__factory.connect(hpsmAddress, signer);
  const isWithdraw = await isTokenPegged(fromToken, toToken, signer, network);
  const isDeposit = await isTokenPegged(toToken, fromToken, signer, network);
  if (isDeposit) {
    return(await hpsm.populateTransaction.deposit(toToken, fromToken, fromAmount));
  } 
  if (isWithdraw) {
    return(await hpsm.populateTransaction.withdraw(fromToken, toToken, fromAmount));
  } 
  throw new Error(`There is no peg between ${fromToken} and ${toToken}`);
};
