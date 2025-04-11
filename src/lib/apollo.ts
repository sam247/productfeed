import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_SHOPIFY_ADMIN_API_URL || 'https://plugin-test-shop.myshopify.com/admin/api/2024-01/graphql.json',
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_API_SECRET || '',
  },
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
}); 