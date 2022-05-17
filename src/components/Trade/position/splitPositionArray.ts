import { BigNumber } from "ethers";

export const splitPositionArray = (positions: BigNumber[]): BigNumber[][] => {
  const positionArray = [];
  for (let i = 0; i < positions.length; i += 9) {
    positionArray.push(positions.slice(i, i + 9));
  }
  return positionArray;
};
