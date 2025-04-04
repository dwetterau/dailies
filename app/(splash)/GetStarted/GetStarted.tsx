import { Button } from "@/components/ui/button";
import Link from "next/link";

export const GetStarted = () => {
  return (
    <div className="flex grow flex-col">
      <div className="container mb-20 flex grow flex-col justify-center">
        <h1 className="mb-8 mt-16 flex flex-col items-center gap-8 text-center text-6xl font-extrabold leading-none tracking-tight">
          Dailies
        </h1>
        <div className="mb-8 text-center text-lg text-muted-foreground">
          Track your daily activities in one place.
        </div>
        <div className="mb-16 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/workouts">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
