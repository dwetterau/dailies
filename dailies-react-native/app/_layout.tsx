import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAuth0, Auth0Provider } from "react-native-auth0";
import Constants from "expo-constants";

import { Stack } from "expo-router";
import { useCallback, useMemo } from "react";

const { EXPO_PUBLIC_CONVEX_URL } = Constants.expoConfig?.extra ?? {};

const convex = new ConvexReactClient(EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
  verbose: true,
});

function useAuthFromAuth0() {
  const { isLoading, user, getCredentials } = useAuth0();
  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const response = await getCredentials(
          "openid email profile offline_access",
          undefined,
          {},
          forceRefreshToken
        );
        const idToken = response?.idToken ?? null;
        return idToken;
      } catch (e) {
        console.error("Error fetching token", e);
        return null;
      }
    },
    [getCredentials]
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken]
  );
}

export default function RootLayout() {
  return (
    <Auth0Provider
      domain={"dev-0a4aznywud2xhrvr.us.auth0.com"}
      clientId={"ltcnlDIWJ6GxDCWpdW1fsosaPSR4KwCZ"}
    >
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuth0}>
        <Stack />
      </ConvexProviderWithAuth>
    </Auth0Provider>
  );
}
