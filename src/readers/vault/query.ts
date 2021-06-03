import { gql } from "graphql-request/dist";

export default gql`
  query ($account: String!, $fxToken: String!) {
    vaults(where: { account: $account, fxToken: $fxToken }, first: 1) {
      debt
      collateralTokens {
        address
        amount
      }
    }
  }
`;
