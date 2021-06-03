import { gql } from "graphql-request/dist";

export default gql`
  query {
    fxTokens {
      name
      symbol
      rewardRatio
      totalSupply
      isValid
    }
  }
`;
