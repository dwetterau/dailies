"use client";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useAuth0 } from "@auth0/auth0-react"
import { PersonIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export default function SignInPage() {
  const { loginWithRedirect } = useAuth0();
  const { toast } = useToast();
  const [step, setStep] = useState<"signUp" | "signIn">("signIn");

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
