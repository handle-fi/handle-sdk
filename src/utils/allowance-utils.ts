import { ethers } from "ethers";
import { BENTOBOX_ADDRESS, KASHI_ADDRESS } from "@sushiswap/core-sdk";
import { SingleCollateralVaultNetwork } from "../types/network";
import { SushiBento__factory } from "../contracts";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";

export const getIsKashiApproved = async (
  account: string,
  network: SingleCollateralVaultNetwork,
  signer: ethers.Signer
): Promise<boolean> => {
  const chainId = NETWORK_NAME_TO_CHAIN_ID[network];
  const bentoBoxAddress = BENTOBOX_ADDRESS[chainId];
  const kashiAddress = KASHI_ADDRESS[chainId];
  const contract = SushiBento__factory.connect(bentoBoxAddress, signer);
  return contract.masterContractApproved(kashiAddress, account);
};

export const signKashiApproval = async (
  account: string,
  network: SingleCollateralVaultNetwork,
  signer: ethers.Signer
): Promise<ethers.Signature> => {
  const chainId = NETWORK_NAME_TO_CHAIN_ID[network];
  const bentoBoxAddress = BENTOBOX_ADDRESS[chainId];
  const kashiAddress = KASHI_ADDRESS[chainId];
  const contract = SushiBento__factory.connect(bentoBoxAddress, signer);

  const warning = "Give FULL access to funds in (and approved to) BentoBox?";
  const nonce = await contract.nonces(account);
  const message = {
    warning,
    user: account,
    masterContract: kashiAddress,
    approved: true,
    nonce
  };

  const typedData = {
    types: {
      SetMasterContractApproval: [
        { name: "warning", type: "string" },
        { name: "user", type: "address" },
        { name: "masterContract", type: "address" },
        { name: "approved", type: "bool" },
        { name: "nonce", type: "uint256" }
      ]
    },
    primaryType: "SetMasterContractApproval",
    domain: {
      name: "BentoBox V1",
      chainId: chainId,
      verifyingContract: bentoBoxAddress
    },
    message: message
  };

  const signature = await (signer as any)._signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message
  );

  return ethers.utils.splitSignature(signature);
};
