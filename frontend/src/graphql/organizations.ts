import { gql } from "@apollo/client";

export const GET_ORGANIZATIONS = gql`
  query Organizations {
    organizations {
      id
      name
      slug
    }
  }
`;
