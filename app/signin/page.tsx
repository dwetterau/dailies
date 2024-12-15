"use client";

import { Button } from "@/components/ui/button";
import { useAuth0 } from "@auth0/auth0-react"
import { PersonIcon } from "@radix-ui/react-icons";

export default function SignInPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="flex min-h-screen w-full container my-auto mx-auto">
      <div className="max-w-[384px] mx-auto flex flex-col my-auto gap-4 pb-8">
        <h2 className="font-semibold text-2xl tracking-tight">
          Sign in or create an account
        </h2>
     <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => loginWithRedirect()}
    >
      <PersonIcon className="mr-2 h-4 w-4" /> Sign in
    </Button>   
      </div>
    </div>
  );
}
