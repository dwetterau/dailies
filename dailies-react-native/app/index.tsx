import { Button, Text, View } from "react-native";
import { useAuth0 } from "react-native-auth0";
import HomePage, { HOME_PAGE_STYLES } from "./home_page";
import LoadingScreen from "./loading_screen";

export default function Index() {
  const { user, authorize, isLoading } = useAuth0();

  // Show loading screen while checking authentication status
  if (isLoading) {
    return <LoadingScreen message="Logging in..." />;
  }

  if (user) {
    return <HomePage />;
  }

  return (
    <View style={HOME_PAGE_STYLES.container}>
      <Text style={HOME_PAGE_STYLES.title}>Dailies 2</Text>
      <Button
        onPress={async () => {
          try {
            await authorize({ scope: "openid email profile offline_access" });
          } catch (e) {
            console.log("Error logging in", e);
          }
        }}
        title="Log in"
      />
    </View>
  );
}
