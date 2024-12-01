"use client";

import { WorkoutList } from "@/app/workouts/workout_list";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth0 } from "@auth0/auth0-react";
import { assert, assertIsNotNull } from "@/lib/utils";
import { Loading } from "@/components/Loading";

function useStoreUserEffect() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user } = useAuth0();

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function createUser() {
      const id = await storeUser();
      setUserId(id);
    }
    createUser();
    return () => setUserId(null)
  }, [isAuthenticated, storeUser, user?.email]);

  return {
    isLoading: isLoading || (isAuthenticated && userId === null),
    isAuthenticated: isAuthenticated && userId !== null,
  }
}

export default function ProductPage() {
   // This is a strange place for this, but it needs to be within the provider
  const {isLoading, isAuthenticated} = useStoreUserEffect();

  if (isLoading || !isAuthenticated) {
    return <Loading /> 
  }
  return <LoggedInWorkoutsPage />
}


function LoggedInWorkoutsPage() {
  const viewer = useQuery(api.users.viewer);
  if (!viewer) {
    return <Loading /> 
  }

  return (
    <main className="flex max-h-screen grow flex-col overflow-hidden">
      <div className="flex items-start justify-between border-b p-4">
        <div className="flex flex-col gap-2"></div>
        <UserMenu>{viewer.name}</UserMenu>
      </div>
      <WorkoutList viewer={viewer._id} />
    </main>
  );
}
