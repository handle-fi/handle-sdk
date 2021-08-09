import { gql } from "graphql-request/dist";

export default gql`
  query {
    vaultRegistries {
      id
      owners
    }
  }
`;
