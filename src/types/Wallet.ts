import { Vault } from "./Vault";

export type Wallet = {
  address: string,
  vaults: Vault[]
};
