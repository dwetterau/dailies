import { useQuery } from "convex/react";
import {api} from "@convex/_generated/api"
import { Button, Text, View } from "react-native";
import { useAuth0 } from "react-native-auth0";

export default function Index() {
  const {user, authorize} = useAuth0();

  if (user) {
    return <EntityList />
  }
  return <View>
    <Button onPress={async () => {
      try {
        await authorize();
      } catch (e) {
        console.log('Error logging in', e);
      }
    }} title="Log in" />
  </View>
}

function EntityList() {
  const entities = useQuery(api.entities.list, {})
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {entities?.entities.map(entity => <Text key={entity._id}>{entity.name}</Text>)}
    </View>
  );
}
