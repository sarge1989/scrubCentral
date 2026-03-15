/// <reference types="@cloudflare/workers-types" />

import type { AppLoadContext as OriginalAppLoadContext } from "react-router";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// Make TypeScript aware of the Cloudflare environment
declare global {
  interface Env extends Cloudflare.Env {
    VALUE_FROM_CLOUDFLARE: string;
    BACKEND_DO: DurableObjectNamespace;
    //TODO: DELETE IF NO D1 DATABASE IS USED
    DB: D1Database;
    //TODO: DELETE IF NO R2 BUCKET IS USED
    BUCKET: R2Bucket;
    //TODO: DELETE IF NOT USING CLERK AUTHENTICATION
    VITE_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    //TODO: DELETE IF NOT USING STRIPE PAYMENTS
    VITE_STRIPE_PUBLISHABLE_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
  }
}

export {};