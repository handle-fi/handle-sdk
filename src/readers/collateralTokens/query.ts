import { gql } from "graphql-request/dist";

export default gql`
  query {
    collateralTokens {
      name
      symbol
      mintCollateralRatio
      liquidationFee
      totalBalance
      isValid
    }
  }
`;
