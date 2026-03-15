//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/react-router";
import { requireAuth } from "../lib/auth.server";
import type { Route } from "./+types/dashboard";

export async function loader(args: Route.LoaderArgs) {
  // This will redirect to sign-in if user is not authenticated
  const { userId } = await requireAuth(args);
  
  // You can fetch user-specific data here
  return {
    message: "This is a protected route",
    userId
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="p-8">
      <SignedIn>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Protected Dashboard</h1>
          <UserButton />
        </div>
        <p>Welcome! Your user ID is: {loaderData.userId}</p>
        <p className="text-gray-600 mt-2">{loaderData.message}</p>
      </SignedIn>
      
      <SignedOut>
        <p>You should not see this - the loader should have redirected you.</p>
      </SignedOut>
    </div>
  );
}