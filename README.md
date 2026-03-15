# React Router + Hono Full-Stack Template for Cloudflare Workers

A production-ready full-stack template with authentication, database bindings, and modern tooling - all deployable to Cloudflare's edge network.

## 🚀 Quick Start

```bash
# Clone the template
git clone <your-repo-url>
cd react-hono-template

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:5173 to see your app running!

## 📋 Template Features & Configuration

This template includes several **optional** features pre-configured with TODO comments. **Delete what you don't need!**

### 🔍 Finding TODOs
Search for `TODO:` comments throughout the codebase to find features you can remove:
- `TODO: DELETE IF NOT USING CLERK AUTHENTICATION` - Clerk auth setup
- `TODO: DELETE IF NO DURABLE OBJECTS ARE USED` - Durable Objects
- `TODO: DELETE IF NO D1 DATABASE IS USED` - D1 Database
- `TODO: DELETE IF NO R2 BUCKET IS USED` - R2 Storage

### 🔐 Authentication (Clerk) - Optional

If you want authentication:

1. **Create a Clerk account** at https://dashboard.clerk.com
2. **Create a new application** in Clerk Dashboard
3. **Get your API keys**:
   - Copy your **Publishable Key** 
   - Copy your **Secret Key**
4. **Configure keys**:
   ```bash
   # For local development, create .dev.vars
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars and add your CLERK_SECRET_KEY
   
   # Update wrangler.jsonc with your Publishable Key
   # Replace the placeholder key in VITE_CLERK_PUBLISHABLE_KEY
   
   # For production
   npx wrangler secret put CLERK_SECRET_KEY
   ```
5. **Test authentication**: Visit `/dashboard` to see protected route

**Don't want authentication?** Search for `TODO: DELETE IF NOT USING CLERK AUTHENTICATION` and remove all marked code.

### 💾 Database & Storage - Optional

#### D1 Database (SQLite at the edge)
```bash
# Create a D1 database
npx wrangler d1 create my-database

# Update wrangler.jsonc with the database_id from output
```

**Don't need D1?** Remove sections marked `TODO: DELETE IF NO D1 DATABASE IS USED`

#### R2 Storage (Object storage)
```bash
# Create an R2 bucket
npx wrangler r2 bucket create my-bucket

# Update bucket_name in wrangler.jsonc
```

**Don't need R2?** Remove sections marked `TODO: DELETE IF NO R2 BUCKET IS USED`

#### Durable Objects (Stateful workers)
Already configured with `BackendDurableObject` class.

**Don't need Durable Objects?** Remove sections marked `TODO: DELETE IF NO DURABLE OBJECTS ARE USED`

### 💳 Payments (Stripe) - Optional

If you want payments:

1. **Create a Stripe account** at https://dashboard.stripe.com
2. **Get your API keys** from the Stripe Dashboard (test mode first)
3. **Configure keys**:
   ```bash
   # Update wrangler.jsonc with your Publishable Key
   # Replace VITE_STRIPE_PUBLISHABLE_KEY placeholder
   
   # For local development, add to .dev.vars:
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # For production:
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
4. **Set up webhook** in Stripe Dashboard pointing to `/api/stripe/webhook`
5. **Available endpoints**:
   - `POST /api/stripe/create-checkout-session` - Stripe-hosted checkout
   - `POST /api/stripe/create-payment-intent` - Custom payment forms
   - `POST /api/stripe/webhook` - Payment confirmations

**Don't want payments?** Remove sections marked `TODO: DELETE IF NOT USING STRIPE PAYMENTS`

## 🛠 Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run typecheck  # Run TypeScript checks
npm run deploy     # Deploy to Cloudflare Workers
```

## 🚢 Deployment

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

2. **Configure your project**:
   - Update `name` in `wrangler.jsonc` with your project name
   - Ensure all environment variables are set

3. **Deploy**:
   ```bash
   npm run deploy
   ```

4. **Set production secrets** (if using Clerk):
   ```bash
   npx wrangler secret put CLERK_SECRET_KEY
   ```

## 📚 Architecture Overview

This template uses **React Router v7 in framework mode** with SSR on Cloudflare Workers:

- **Frontend**: React Router handles routing and SSR
- **Backend**: Hono provides API endpoints at `/api/*`
- **Edge Runtime**: Everything runs on Cloudflare Workers

### When to use React Router Loaders vs Hono APIs:
- **Loaders**: Initial page data, SEO content, direct database access
- **Hono APIs**: Client interactions, form submissions, webhooks, mobile endpoints

See `CLAUDE.md` for detailed architecture documentation.

## 🏗 Project Structure

```
app/
├── routes/           # React Router pages
│   ├── home.tsx     # Home page
│   ├── dashboard.tsx # Protected route example
│   └── sign-in.$.tsx # Clerk sign-in page
├── lib/             # Utilities
│   ├── auth.server.ts # Server-side auth helpers
│   └── api.ts       # Client-side API helpers
└── root.tsx         # App root with ClerkProvider

workers/
├── app.ts           # Hono API server
├── middleware/      # API middleware
│   └── auth.ts      # Clerk JWT verification
└── durableObjects/  # Durable Object classes

wrangler.jsonc       # Cloudflare configuration
```

## 📖 Resources

- [React Router v7 Docs](https://reactrouter.com/)
- [Hono Documentation](https://hono.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [R2 Storage](https://developers.cloudflare.com/r2/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
