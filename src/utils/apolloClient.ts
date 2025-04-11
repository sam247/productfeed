import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_SHOPIFY_APP_URL ? 
    `${process.env.NEXT_PUBLIC_SHOPIFY_APP_URL}/graphql` : 
    'http://localhost:3000/graphql',
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
}); 