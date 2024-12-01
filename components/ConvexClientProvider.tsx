"use client";

// import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react"
import { ConvexProviderWithAuth0 } from "convex/react-auth0";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  verbose: true,
});

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Auth0Provider 
        domain={"dev-0a4aznywud2xhrvr.us.auth0.com"} 
        clientId={"ZX9DQwHS3QrzVSvtarUa5h5UyKinGClN"} 
        authorizationParams={{redirect_uri: window.location.origin}}>
          <ConvexProviderWithAuth0 client={convex}>
            {children}
          </ConvexProviderWithAuth0>
    </Auth0Provider>
  );
}
