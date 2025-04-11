'use client';

import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/utils/apolloClient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AppProvider i18n={{}}>
        {children}
      </AppProvider>
    </ApolloProvider>
  );
} 