import { gql } from "graphql-request/dist";

export default (filter: string) => gql`
  query {
    vaults${filter} {
      account
      debt
      fxToken
      collateralTokens {
        address
        amount
      }
      redeemableTokens
      collateralAsEther
      collateralRatio
      minimumRatio
      isRedeemable
      isLiquidatable
    }
  }
`;
