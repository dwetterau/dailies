"use client";

import { SignInMethodDivider } from "@/components/SignInMethodDivider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useAuthActions } from "@convex-dev/auth/react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const { toast } = useToast();
  const [step, setStep] = useState<"signUp" | "signIn">("signIn");

  return (
    <div className="flex min-h-screen w-full container my-auto mx-auto">
      <div className="max-w-[384px] mx-auto flex flex-col my-auto gap-4 pb-8">
        <h2 className="font-semibold text-2xl tracking-tight">
          Sign in or create an account
        </h2>
        <SignInWithGitHub />
        {/*
        <SignInMethodDivider />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            signIn("password", formData)
              .then(() => setStep(step === "signIn" ? "signUp" : "signIn"))
              .catch((error) => {
                console.error(error);
                toast({
                  title: "Could not log in",
                  variant: "destructive",
                });
              });
          }}
        >
          <label htmlFor="email">Email</label>
          <Input name="email" placeholder="Email" type="text" />
          <label htmlFor="password">Password</label>
          <Input name="password" placeholder="Password" type="password" />
          <input name="flow" type="hidden" value={step} />
          <Button type="submit">
            {step === "signIn" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        */}
      </div>
    </div>
  );
}

function SignInWithGitHub() {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("github", { redirectTo: "/workouts" })}
    >
      <GitHubLogoIcon className="mr-2 h-4 w-4" /> GitHub
    </Button>
  );
}

function SignInWithMagicLink({
  handleLinkSent,
}: {
  handleLinkSent: () => void;
}) {
  const { signIn } = useAuthActions();
  const { toast } = useToast();
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("redirectTo", "/workouts");
        signIn("resend", formData)
          .then(handleLinkSent)
          .catch((error) => {
            console.error(error);
            toast({
              title: "Could not send sign-in link",
              variant: "destructive",
            });
          });
      }}
    >
      <label htmlFor="email">Email</label>
      <Input name="email" id="email" className="mb-4" autoComplete="email" />
      <Button type="submit">Send sign-in link</Button>
      <Toaster />
    </form>
  );
}
