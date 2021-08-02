import { gql } from "graphql-request/dist";

export default gql`
  query($handleAddress: String!) {
    tokenRegistry(
      id: $handleAddress
    ) {
      fxTokens
      collateralTokens
    }
  }
`;
