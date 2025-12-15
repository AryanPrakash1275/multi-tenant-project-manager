// frontend/src/apollo.ts
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { getOrgSlug } from "./tenant";

export const client = (() => {
  const httpLink = new HttpLink({
    uri: "http://localhost:8000/graphql/",
  });

  const orgLink = new ApolloLink((operation, forward) => {
    const prev = operation.getContext().headers || {};
    const slug = getOrgSlug();

    operation.setContext({
      headers: {
        ...prev,
        ...(slug ? { "x-org-slug": slug } : {}), // no header if not selected
      },
    });

    return forward(operation);
  });

  return new ApolloClient({
    link: ApolloLink.from([orgLink, httpLink]),
    cache: new InMemoryCache(),
  });
})();
