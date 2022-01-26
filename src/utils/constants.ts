import { ethers } from "ethers";

export const SECONDS_IN_A_YEAR_BN = ethers.BigNumber.from("60").mul("60").mul("24").mul("365");
