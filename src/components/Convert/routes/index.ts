import { ethers } from "ethers";
import { Quote } from "..";
import { ConvertQuoteInput, ConvertTransactionInput } from "../Convert";
import hlpBuyRemove from "./hlpBuyRemove";
import hlpSwap from "./hlpSwap";
import oneInch from "./oneInch";
import psm from "./psm";
import { WeightInput } from "./weights";
import weth from "./weth";
import zeroX from "./zeroX";

export type Route = {
  weight: (input: WeightInput) => Promise<number>;
  quote: (input: ConvertQuoteInput) => Promise<Quote>;
  transaction: (input: ConvertTransactionInput) => Promise<ethers.PopulatedTransaction>;
};

const routes: Route[] = [psm, hlpBuyRemove, hlpSwap, oneInch, zeroX, weth];

export default routes;
