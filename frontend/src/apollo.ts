import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";

export const createClient = (orgSlug: string) =>
  new ApolloClient({
    link: ApolloLink.from([
      new ApolloLink((operation, forward) => {
        operation.setContext({
          headers: { "x-org-slug": orgSlug },
        });
        return forward(operation);
      }),
      new HttpLink({ uri: "http://localhost:8000/graphql/" }),
    ]),
    cache: new InMemoryCache(),
  });
