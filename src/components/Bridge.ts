import { FxTokenAddresses } from "../config";
import sdkConfig from "../config";
import { FxTokenSymbol, Network, NetworkMap } from "..";
import { Bridge__factory, ERC20__factory } from "../contracts";
import { DepositEvent } from "../contracts/Bridge";
import { ethers } from "ethers";
import { getFxTokenSymbolFromAddress } from "../utils/fxToken-utils";

export type BridgeConfigByNetwork = NetworkMap<{ address: string; id: number }>;

export type BridgeToken = FxTokenSymbol | "FOREX";

export type BridgeConfig = {
  byNetwork: BridgeConfigByNetwork;
  forexAddress: string;
  fxTokenAddresses: FxTokenAddresses;
};

export type BridgeDepositArguments = {
  fromNetwork: Network;
  toNetwork: Network;
  tokenSymbol: BridgeToken;
  amount: ethers.BigNumber;
};

export type BridgeWithdrawArguments = {
  tokenSymbol: BridgeToken;
  amount: ethers.BigNumber;
  nonce: number;
  fromNetwork: Network;
  toNetwork: Network;
  signature: string;
};

type DepositEventData = DepositEvent["args"] & {
  txHash: string;
};

type PendingWithdrawal = {
  txHash: string;
  tokenSymbol: BridgeToken;
  amount: ethers.BigNumber;
  nonce: number;
  fromNetwork: Network;
  toNetwork: Network;
};

export default class Bridge {
  public config: BridgeConfig;

  constructor(c?: BridgeConfig) {
    this.config = c || {
      forexAddress: sdkConfig.forexAddress,
      byNetwork: sdkConfig.bridges,
      fxTokenAddresses: sdkConfig.fxTokenAddresses
    };
  }
  public deposit(
    args: BridgeDepositArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public deposit(
    args: BridgeDepositArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public deposit(
    args: BridgeDepositArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const bridgeContract = this.getBridgeContract(args.fromNetwork, signer);
    const tokenAddress = this.getTokenAddress(args.tokenSymbol);
    const contract = populateTransaction ? bridgeContract.populateTransaction : bridgeContract;
    return contract.deposit(
      tokenAddress,
      args.amount,
      this.config.byNetwork[args.toNetwork].id,
      options
    );
  }

  public withdraw(
    args: BridgeWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public withdraw(
    args: BridgeWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public async withdraw(
    args: BridgeWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const bridgeContract = this.getBridgeContract(args.fromNetwork, signer);
    const tokenAddress = this.getTokenAddress(args.tokenSymbol);
    const contract = populateTransaction ? bridgeContract.populateTransaction : bridgeContract;
    const address = await signer.getAddress();
    return contract.withdraw(
      address,
      tokenAddress,
      args.amount,
      args.nonce,
      this.config.byNetwork[args.fromNetwork].id,
      ethers.utils.arrayify(args.signature),
      options
    );
  }

  public getDepositAllowance = (
    account: string,
    token: BridgeToken,
    network: Network,
    signer: ethers.Signer
  ): Promise<ethers.BigNumber> => {
    const tokenAddress = this.getTokenAddress(token);
    const bridgeAddress = this.config.byNetwork[network].address;
    const contract = ERC20__factory.connect(tokenAddress, signer);
    return contract.allowance(account, bridgeAddress);
  };

  public setDepositAllowance(
    token: BridgeToken,
    network: Network,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public setDepositAllowance(
    token: BridgeToken,
    network: Network,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public setDepositAllowance(
    token: BridgeToken,
    network: Network,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const tokenAddress = this.getTokenAddress(token);
    const bridgeAddress = this.config.byNetwork[network].address;
    const tokenContract = ERC20__factory.connect(tokenAddress, signer);
    const contract = populateTransaction ? tokenContract.populateTransaction : tokenContract;
    return contract.approve(bridgeAddress, amount);
  }

  public getPendingWithdrawals = async (
    account: string,
    signers: NetworkMap<ethers.Signer>
  ): Promise<PendingWithdrawal[]> => {
    const depositEventPromises = Object.keys(signers).map((n) => {
      const network = n as Network;
      return this.getPendingWithdrawsForNetwork(account, network, signers);
    });

    const results = await Promise.all(depositEventPromises);
    return results.reduce((acc, curr) => [...acc, ...curr], []);
  };

  private getPendingWithdrawsForNetwork = async (
    account: string,
    network: Network,
    signers: NetworkMap<ethers.Signer>
  ): Promise<PendingWithdrawal[]> => {
    const signer = signers[network];
    const bridgeContract = this.getBridgeContract(network, signer);
    const fromBlock =
      network === "polygon" ? (await signer.provider!.getBlockNumber()) - 1990 : undefined;

    const filter = bridgeContract.filters.Deposit(account);

    const rawEvents = await bridgeContract.queryFilter(filter, fromBlock);

    const events: DepositEventData[] = rawEvents.map((event) => {
      return {
        txHash: event.transactionHash,
        ...(bridgeContract.interface.parseLog(event).args as unknown as DepositEvent["args"])
      };
    });

    const eventsByNetwork = events.reduce((progress, event) => {
      const property = this.bridgeIdToNetwork(event.toId.toNumber());
      const values = progress[property] || [];
      return {
        ...progress,
        [property]: [...values, event]
      };
    }, {} as Partial<NetworkMap<DepositEventData[]>>);

    const networksWithEvents = Object.keys(eventsByNetwork) as Network[];

    const withdrawCounts = await Promise.all(
      networksWithEvents.map((n) => {
        return bridgeContract.withdrawNonce(account, this.config.byNetwork[n].id);
      })
    );

    const withdrawCountsByNetwork = withdrawCounts.reduce((progress, count, index) => {
      return {
        ...progress,
        [networksWithEvents[index]]: Number(count.toString())
      };
    }, {} as Partial<NetworkMap<number>>);

    const pendingWithdraws = networksWithEvents.reduce((progress, network) => {
      const events = eventsByNetwork[network];
      const depositCount = events?.length || 0;
      const withdrawCount = withdrawCountsByNetwork[network || 0];
      const pendingCount = depositCount - (withdrawCount || 0);

      const pendingEvents = events?.slice(0, pendingCount) || [];

      return [...progress, ...pendingEvents];
    }, [] as DepositEventData[]);

    return pendingWithdraws.map((pw) => ({
      txHash: pw.txHash,
      tokenSymbol: this.getTokenSymbolFromAddress(pw.token),
      amount: pw.amount,
      nonce: pw.nonce.toNumber(),
      fromNetwork: this.bridgeIdToNetwork(pw.fromId.toNumber()),
      toNetwork: this.bridgeIdToNetwork(pw.toId.toNumber())
    }));
  };

  private getTokenAddress = (token: BridgeToken) => {
    const tokenAddress =
      token === "FOREX" ? this.config.forexAddress : this.config.fxTokenAddresses[token];

    if (!tokenAddress) {
      throw new Error(`Invalid token symbol: ${token}`);
    }

    return tokenAddress;
  };

  private getTokenSymbolFromAddress = (tokenAddress: string): BridgeToken => {
    if (tokenAddress === this.config.forexAddress) {
      return "FOREX";
    }

    return getFxTokenSymbolFromAddress(tokenAddress, this.config.fxTokenAddresses);
  };

  private getBridgeContract = (network: Network, signer: ethers.Signer) => {
    return Bridge__factory.connect(this.config.byNetwork[network].address, signer);
  };

  private bridgeIdToNetwork = (bridgeId: number): Network => {
    const networkNames = Object.keys(this.config.byNetwork);
    const ids = Object.values(this.config.byNetwork).map((x) => x.id);
    const index = ids.indexOf(bridgeId);
    return networkNames[index] as Network;
  };
}
