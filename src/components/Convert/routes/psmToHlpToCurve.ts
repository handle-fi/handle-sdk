import { ethers } from "ethers";
import {
  combineFees,
  curveFeeToBasisPoints,
  getMinOut,
  getPsmToHlpToCurvePath,
  Path
} from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP_TO_CURVE, WeightInput } from "./weights";
import psmToHlp from "./psmToHlp";
import HandleTokenManager from "../../TokenManager/HandleTokenManager";
import { config, HlpConfig, Network } from "../../..";
import { CurveMetapoolFactory__factory } from "../../../contracts/factories/CurveMetapoolFactory__factory";
import { CurveMetapool__factory } from "../../../contracts/factories/CurveMetapool__factory";
import { RouterHpsmHlpCurve__factory } from "../../../contracts";
import { Pair } from "../../../types/trade";
import { fetchEncodedSignedQuotes } from "../../../utils/h2so-utils";

const cache: Record<string, Path> = {};

const getPsmToHlpToCurvePathFromCache = async (
  from: string,
  to: string,
  network: Network,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): Promise<Path> => {
  const key = `${from}${to}${network}`;
  if (cache[key] !== undefined) return cache[key];
  cache[key] = await getPsmToHlpToCurvePath(from, to, network, signerOrProvider);
  return cache[key];
};

const psmToHlpToCurveWeight = async (input: WeightInput): Promise<number> => {
  if (!input.signerOrProvider) return 0; // must have signer to check curve pool

  const path = await getPsmToHlpToCurvePathFromCache(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signerOrProvider
  );
  if (!path) return 0;
  return PSM_TO_HLP_TO_CURVE;
};

const psmToHlpToCurveQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  if (!input.signerOrProvider) throw new Error("signer / provider required for quote");
  const tokenManager = new HandleTokenManager();
  const path = await getPsmToHlpToCurvePathFromCache(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signerOrProvider
  );
  if (!path) throw new Error("No path available");

  const intermediateToken = tokenManager.getTokenByAddress(path.hlpToken, input.network);
  if (!intermediateToken) throw new Error("No intermediate token");

  const psmToHlpQuote = await psmToHlp.quote({
    ...input,
    toToken: intermediateToken
  });

  const metapoolFactory = CurveMetapoolFactory__factory.connect(
    path.factory,
    input.signerOrProvider
  );

  const [fromIndex, toIndex, useUnderlying] = await metapoolFactory.get_coin_indices(
    path.pool,
    path.hlpToken,
    path.curveToken
  );

  const pool = CurveMetapool__factory.connect(path.pool, input.signerOrProvider);
  const amountOutPromise = useUnderlying
    ? pool.get_dy_underlying(fromIndex, toIndex, psmToHlpQuote.buyAmount)
    : pool.get_dy(fromIndex, toIndex, psmToHlpQuote.buyAmount);

  const feesPromise = pool.fee();

  const [amountOut, fees] = await Promise.all([amountOutPromise, feesPromise]);

  const curveFeeBasisPoints = curveFeeToBasisPoints(fees.toNumber());

  // multiply amount out (which includes fees) by the reciprocal of fees
  const amountOutWithoutFees = amountOut
    .mul(HlpConfig.BASIS_POINTS_DIVISOR)
    .div(HlpConfig.BASIS_POINTS_DIVISOR - curveFeeBasisPoints);

  const combinedFees = combineFees(
    psmToHlpQuote.feeBasisPoints,
    curveFeeBasisPoints // safely can be cast to number as it is always under 1e8
  );

  return {
    feeBasisPoints: combinedFees,
    allowanceTarget: config.protocol.arbitrum.protocol.routerHpsmHlpCurve,
    sellAmount: psmToHlpQuote.sellAmount,
    buyAmount: amountOutWithoutFees.toString(),
    feeChargedBeforeConvert: false,
    gas: config.convert.gasEstimates.hpsmToHlpToCurve
  };
};

const psmToHlpToCurveTransactionHandler = async (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  const path = await getPsmToHlpToCurvePathFromCache(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signer
  );
  if (!path) throw new Error("No path found for psmToHlpToCurve swap");
  const router = RouterHpsmHlpCurve__factory.connect(
    config.protocol.arbitrum.protocol.routerHpsmHlpCurve,
    input.signer
  );

  const minOut = getMinOut(input.buyAmount, input.slippage);

  const TokenManager = new HandleTokenManager();

  const fxToken = TokenManager.getTokenByAddress(path.fxToken, input.network);
  const hlpToken = TokenManager.getTokenByAddress(path.hlpToken, input.network);

  if (!fxToken || !hlpToken) throw new Error("Could not find token");

  const pairs: Pair[] = [
    {
      baseSymbol: fxToken.symbol,
      quoteSymbol: "USD"
    }
  ];

  if (fxToken.symbol !== hlpToken.symbol) {
    pairs.push({
      baseSymbol: hlpToken.symbol,
      quoteSymbol: "USD"
    });
  }

  const { encoded } = await fetchEncodedSignedQuotes(pairs);

  return router.populateTransaction.swapPeggedTokenToCurveToken(
    path.peggedToken,
    path.fxToken,
    path.hlpToken,
    path.curveToken,
    input.sellAmount,
    input.receivingAccount,
    minOut,
    path.factory,
    path.pool,
    encoded
  );
};

export default {
  weight: psmToHlpToCurveWeight,
  quote: psmToHlpToCurveQuoteHandler,
  transaction: psmToHlpToCurveTransactionHandler
};
