import { Hono } from "hono";
import { createRequestHandler } from "react-router";
//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
import { clerkAuth, getAuth } from "./middleware/auth";

const app = new Hono<{ Bindings: Env }>();

//TODO: DELETE IF NO DURABLE OBJECTS ARE USED
// Example API route using Durable Object
app.get("/api/do/:id", async (c) => {
  const id = c.req.param("id");
  const doId = c.env.BACKEND_DO.idFromName(id);
  const stub = c.env.BACKEND_DO.get(doId);
  const response = await stub.fetch(c.req.raw);
  return response;
});

//TODO: DELETE IF NO D1 DATABASE IS USED
// Example D1 database route
app.get("/api/d1/example", async (c) => {
  // Example: Create table if not exists
  // await c.env.DB.exec(`
  //   CREATE TABLE IF NOT EXISTS users (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     name TEXT NOT NULL,
  //     email TEXT UNIQUE NOT NULL
  //   )
  // `);
  
  // Example: Query data
  // const result = await c.env.DB.prepare("SELECT * FROM users").all();
  // return c.json(result);
  
  return c.json({ message: "D1 database endpoint - implement your logic here" });
});

//TODO: DELETE IF NO R2 BUCKET IS USED
// Example R2 storage route
app.post("/api/r2/upload", async (c) => {
  // Example: Upload file to R2
  // const formData = await c.req.formData();
  // const file = formData.get("file") as File;
  // if (file) {
  //   const arrayBuffer = await file.arrayBuffer();
  //   await c.env.BUCKET.put(file.name, arrayBuffer);
  //   return c.json({ message: "File uploaded successfully" });
  // }
  
  return c.json({ message: "R2 storage endpoint - implement your upload logic here" });
});

app.get("/api/r2/:key", async (c) => {
  // Example: Get file from R2
  // const key = c.req.param("key");
  // const object = await c.env.BUCKET.get(key);
  // if (object) {
  //   return new Response(object.body, {
  //     headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream" }
  //   });
  // }
  // return c.notFound();
  
  return c.json({ message: "R2 storage endpoint - implement your retrieval logic here" });
});

//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
// Example: Protected API route
app.get("/api/me", clerkAuth, async (c) => {
  const { userId } = getAuth(c);
  
  // You can use the userId to fetch user-specific data
  return c.json({ 
    userId,
    message: "This is a protected API route" 
  });
});

// Example: Public API route
app.get("/api/public", async (c) => {
  return c.json({ message: "This is a public API route" });
});

// Add more routes here

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;

// Export Durable Object classes
export { BackendDurableObject } from "./durableObjects/BackendDurableObject";
