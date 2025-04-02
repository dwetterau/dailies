import { Button, View } from "react-native";
import { useAuth0 } from "react-native-auth0";
import EntityList from "./entity_list";

export default function Index() {
  const { user, authorize } = useAuth0();

  if (user) {
    return <EntityList />;
  }
  return (
    <View>
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
