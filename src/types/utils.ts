import { fxTokens } from "./ProtocolTokens";
import { SDK } from "./SDK";

export const tokenAddressToFxToken = (address: string, sdk: SDK): fxTokens => {
  const token = Object.keys(sdk.contracts).find((key) => {
    const typedKey = key as keyof SDK["contracts"];

    return sdk.contracts[typedKey].address.toLowerCase() === address;
  });

  return token as fxTokens;
};
