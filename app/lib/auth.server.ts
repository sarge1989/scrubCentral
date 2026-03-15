//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
import { getAuth } from "@clerk/react-router/ssr.server";
import { createClerkClient } from "@clerk/react-router/api.server";
import { redirect } from "react-router";

/**
 * Helper to require authentication in loaders/actions
 * Redirects to sign-in if not authenticated
 */
export async function requireAuth(args: any) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    const url = new URL(args.request.url);
    throw redirect(`/sign-in?redirect_url=${encodeURIComponent(url.pathname)}`);
  }
  
  return { userId };
}

/**
 * Get the current user details from Clerk
 */
export async function getCurrentUser(args: any) {
  const { userId } = await requireAuth(args);
  
  const secretKey = args.context?.cloudflare?.env?.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }
  
  const clerkClient = createClerkClient({ secretKey });
  const user = await clerkClient.users.getUser(userId);
  
  return user;
}

export { getAuth };