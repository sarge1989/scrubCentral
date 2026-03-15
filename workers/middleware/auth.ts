//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";

/**
 * Middleware to verify Clerk authentication for Hono API routes
 */
export const clerkAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader) {
    return c.json({ error: "No authorization header" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const secretKey = c.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      return c.json({ error: "Authentication not configured" }, 500);
    }

    // Verify the JWT token from Clerk
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties: [], // Add your frontend URLs if needed
    });

    // Add user info to context for use in routes
    c.set("userId", payload.sub);
    c.set("sessionId", payload.sid);
    c.set("auth", payload);
    
    await next();
  } catch (error) {
    console.error("Auth verification failed:", error);
    return c.json({ error: "Invalid token" }, 401);
  }
});

/**
 * Helper to get auth from context in Hono routes
 */
export function getAuth(c: any) {
  return {
    userId: c.get("userId"),
    sessionId: c.get("sessionId"),
    auth: c.get("auth"),
  };
}