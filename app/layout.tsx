"use client";

import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import SignInPage from "./signin/page";
import { Loading } from "@/components/Loading";

const inter = Inter({ subsets: ["latin"] });

/*export const metadata: Metadata = {
  title: "Dailes",
  description: "An app for tracking your daily activities",
  // TODO: set an icon
};*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* `suppressHydrationWarning` only affects the html tag,
  and is needed by `ThemeProvider` which sets the theme
  class attribute on it */
  return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class">
          <ConvexClientProvider>
            <Authenticated>
              {children}
            </Authenticated> 
            <Unauthenticated>
                <SignInPage />
            </Unauthenticated>
            <AuthLoading>
                <Loading />
            </AuthLoading>
          </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
  );
}
