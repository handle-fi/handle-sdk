import { gql } from "graphql-request/dist";

export default (filter: string) => gql`
  query {
    fxTokens${filter} {
      id
      name
      symbol
      totalSupply
      isValid
      decimals
      rate
    }
  }
`;
