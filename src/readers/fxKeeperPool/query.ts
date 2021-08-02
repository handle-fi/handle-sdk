import { gql } from "graphql-request/dist";

export default (filter: string) => gql`
  query {
    fxKeeperPools${filter} {
      id
      fxToken
      totalDeposits
      depositorCount
      liquidationsExecuted
      collateralTokens {
        address
        amount
      }
      collateralAddresses
    }
  }
`;
