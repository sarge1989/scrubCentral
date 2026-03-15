import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/react-router";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      {/* TODO: DELETE THIS AUTH UI IF NOT USING CLERK AUTHENTICATION */}
      <div className="absolute top-4 right-4">
        <SignedOut>
          <SignInButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <div className="flex gap-4 items-center">
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </Link>
            <UserButton />
          </div>
        </SignedIn>
      </div>
      
      <Welcome message={loaderData.message} />
    </div>
  );
}
