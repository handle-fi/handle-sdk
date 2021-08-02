import { gql } from "graphql-request/dist";

export default (filter: string) => gql`
  query {
    collateralTokens${filter} {
      id
      name
      symbol
      mintCollateralRatio
      liquidationFee
      interestRate
      totalBalance
      isValid
      decimals
      rate
    }
  }
`;
