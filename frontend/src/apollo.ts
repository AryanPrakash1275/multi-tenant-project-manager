// frontend/src/apollo.ts
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";

export const createClient = (orgSlug: string) => {
  if (!orgSlug) throw new Error("orgSlug is required");

  const httpLink = new HttpLink({
    uri: "http://localhost:8000/graphql/",
  });

  const orgLink = new ApolloLink((operation, forward) => {
    const prev = operation.getContext().headers || {};

    operation.setContext({
      headers: {
        ...prev,
        "x-org-slug": orgSlug,
      },
    });

    return forward(operation);
  });

  return new ApolloClient({
    link: ApolloLink.from([orgLink, httpLink]),
    cache: new InMemoryCache(),
  });
};
