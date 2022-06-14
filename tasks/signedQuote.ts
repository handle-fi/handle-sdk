import { task } from "hardhat/config";
import {pairFromString} from "../src/utils/general-utils";
import {fetchEncodedSignedQuotes} from "../src/utils/h2so-utils";

task("fetch-signed-quote")
  .addParam("pairs")
  .setAction(async ({ pairs }, _hre) => {
    pairs = pairs.split(",");
    const data = await fetchEncodedSignedQuotes(pairs.map(pairFromString));
    console.log("data: ", data);
  });
