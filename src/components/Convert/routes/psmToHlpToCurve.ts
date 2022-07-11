import { BigNumber, ethers } from "ethers";
import { combineFees, getPsmToHlpToCurvePath, Path } from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP_TO_CURVE, WeightInput } from "./weights";
import psmToHlp from "./psmToHlp";
import HandleTokenManager from "../../TokenManager/HandleTokenManager";
import { config, HlpConfig, Network } from "../../..";
import { CurveMetapoolFactory__factory } from "../../../contracts/factories/CurveMetapoolFactory__factory";
import { CurveMetapool__factory } from "../../../contracts/factories/CurveMetapool__factory";
import { CURVE_FEE_BASIS_POINTS } from "../../../constants";

const cache: Record<string, Path> = {};

const getPsmToHlpToCurvePathFromCache = async (
  from: string,
  to: string,
  network: Network,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): Promise<Path> => {
  if (cache[from + to + network]) return cache[from + to + network];
  return getPsmToHlpToCurvePath(from, to, network, signerOrProvider);
};

const psmToHlpToCurveWeight = async (input: WeightInput): Promise<number> => {
  if (!input.signerOrProvider) return 0; // must have signer to check curve pool

  const path = await getPsmToHlpToCurvePathFromCache(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signerOrProvider
  );
  console.log(path);
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

  let amountOutPromise: Promise<BigNumber>;
  const pool = CurveMetapool__factory.connect(path.pool, input.signerOrProvider);
  if (useUnderlying) {
    amountOutPromise = pool.get_dy_underlying(fromIndex, toIndex, psmToHlpQuote.buyAmount);
  } else {
    amountOutPromise = pool.get_dy(fromIndex, toIndex, psmToHlpQuote.buyAmount);
  }

  const feesPromise = pool.fee();

  const [amountOut, fees] = await Promise.all([amountOutPromise, feesPromise]);

  // multiply amount out (which includes fees) by the reciprocal of fees
  const amountOutWithoutFees = amountOut
    .mul(CURVE_FEE_BASIS_POINTS)
    .div(BigNumber.from(CURVE_FEE_BASIS_POINTS).sub(fees));

  const combinedFees = combineFees(
    psmToHlpQuote.feeBasisPoints,
    fees.toNumber(), // safely can be cast to number as it is always under 1e8
    HlpConfig.BASIS_POINTS_DIVISOR,
    CURVE_FEE_BASIS_POINTS
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
  _input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  return null as any;
};

export default {
  weight: psmToHlpToCurveWeight,
  quote: psmToHlpToCurveQuoteHandler,
  transaction: psmToHlpToCurveTransactionHandler
};
