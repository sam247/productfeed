'use client';

import { AppProvider, Frame } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo';
import enTranslations from '@shopify/polaris/locales/en.json';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      </head>
      <body>
        <AppProvider i18n={enTranslations}>
          <ApolloProvider client={apolloClient}>
            <Frame>
              {children}
            </Frame>
          </ApolloProvider>
        </AppProvider>
      </body>
    </html>
  );
}
