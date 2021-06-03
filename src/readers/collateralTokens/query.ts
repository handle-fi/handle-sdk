import { gql } from "graphql-request/dist";

export default gql`
  query {
    collateralTokens {
      id
      name
      symbol
      mintCollateralRatio
      liquidationFee
      totalBalance
      isValid
    }
  }
`;
