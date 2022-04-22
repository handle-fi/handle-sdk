import { BigNumber, ethers, PopulatedTransaction } from "ethers";
import { GlpManager__factory } from "../../contracts/factories/GlpManager__factory";
import { HlpManagerRouter__factory } from "../../contracts/factories/HlpManagerRouter__factory";
import { Router__factory } from "../../contracts/factories/Router__factory";
import { BASIS_POINTS_DIVISOR, PerpToken, PERP_CONTRACTS, PRICE_DECIMALS } from "../../perp-config";
import { Network } from "../../types/network";
import { PerpInfoMethods } from "../Trade/types";
import { tryParseNativePerpToken } from "./tryParseNativePerpToken";

export const getLiquidityTokenSwap = async ({
  isFromNative,
  isToNative,
  fromAddress,
  toAddress,
  transactionAmount,
  buyAmountWithTolerance,
  connectedAccount,
  network,
  signer
}: {
  isFromNative: boolean;
  isToNative: boolean;
  fromAddress: string;
  toAddress: string;
  transactionAmount: BigNumber;
  buyAmountWithTolerance: BigNumber;
  connectedAccount: string;
  network: Network;
  signer: ethers.Signer;
}) => {
  let tx: PopulatedTransaction;
  const router = Router__factory.connect(
    PERP_CONTRACTS[network]?.Router ?? ethers.constants.AddressZero,
    signer
  );
  if (!isFromNative && !isToNative) {
    tx = await router.populateTransaction.swap(
      [fromAddress, toAddress],
      transactionAmount,
      // @ts-ignore Overload hell
      buyAmountWithTolerance,
      connectedAccount
    );
  } else if (isFromNative) {
    tx = await router.populateTransaction.swapETHToTokens(
      [fromAddress, toAddress],
      buyAmountWithTolerance,
      connectedAccount,
      // @ts-ignore Overload hell
      { value: transactionAmount }
    );
  } else {
    tx = await router.populateTransaction.swapTokensToETH(
      [fromAddress, toAddress],
      transactionAmount,
      // @ts-ignore Overload hell
      buyAmountWithTolerance,
      connectedAccount
    );
  }
  return tx;
};

export const getHlpTokenSwap = async ({
  fromToken,
  toToken,
  buyAmountWithTolerance,
  connectedAccount,
  sellAmount,
  perpInfo,
  slippage,
  signer,
  network
}: {
  fromToken: PerpToken;
  toToken: PerpToken;
  buyAmountWithTolerance: BigNumber;
  connectedAccount: string;
  sellAmount: BigNumber;
  perpInfo: PerpInfoMethods;
  slippage: number;
  signer: ethers.Signer;
  network: Network;
}) => {
  let tx: PopulatedTransaction;
  const hlpManager = GlpManager__factory.connect(
    PERP_CONTRACTS[network]?.HlpManager ?? ethers.constants.AddressZero,
    signer
  );

  const hlpManagerRouter = HlpManagerRouter__factory.connect(
    PERP_CONTRACTS[network]?.HlpManagerRouter ?? ethers.constants.AddressZero,
    signer
  );

  const { address: fromAddress } = tryParseNativePerpToken(fromToken, network);
  const { address: toAddress } = tryParseNativePerpToken(toToken, network);

  if (fromToken.symbol === "hLP") {
    // selling hlp
    if (toToken.isNative) {
      // if is native
      tx = await hlpManagerRouter.populateTransaction.removeLiquidityETH(
        BigNumber.from(sellAmount),
        buyAmountWithTolerance,
        connectedAccount
      );
    } else {
      // if both tokens are not native
      tx = await hlpManager.populateTransaction.removeLiquidity(
        toAddress,
        BigNumber.from(sellAmount),
        buyAmountWithTolerance,
        connectedAccount
      );
    }
  } else {
    // buying hlp
    const minPriceInUsdg = perpInfo
      .getMinPrice(fromToken.address)
      .mul(10_000 - slippage * 100)
      .div(ethers.utils.parseUnits("1", PRICE_DECIMALS - 18))
      .div(BASIS_POINTS_DIVISOR);

    if (fromToken.isNative) {
      // if is native
      tx = await hlpManagerRouter.populateTransaction.addLiquidityETH(
        minPriceInUsdg,
        buyAmountWithTolerance,
        {
          value: BigNumber.from(sellAmount)
        }
      );
    } else {
      // if not native
      tx = await hlpManager.populateTransaction.addLiquidity(
        fromAddress,
        BigNumber.from(sellAmount),
        minPriceInUsdg,
        buyAmountWithTolerance
      );
    }
  }
  return tx;
};
