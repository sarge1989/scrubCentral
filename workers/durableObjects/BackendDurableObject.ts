//TODO: DELETE IF NO DURABLE OBJECTS ARE USED

import { DurableObject } from "cloudflare:workers";

export class BackendDurableObject extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Handle requests to this Durable Object instance
    return Response.json({ message: "Hello from BackendDurableObject" });
  }
}
