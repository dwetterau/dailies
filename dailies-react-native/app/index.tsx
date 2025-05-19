import { Button, Text, View } from "react-native";
import { useAuth0 } from "react-native-auth0";
import HomePage, { HOME_PAGE_STYLES } from "./home_page";

export default function Index() {
  const { user, authorize } = useAuth0();

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
