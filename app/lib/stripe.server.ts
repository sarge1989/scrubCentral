//TODO: DELETE IF NOT USING STRIPE PAYMENTS
import Stripe from "stripe";

/**
 * Server-side Stripe instance
 * Used in loaders/actions and API routes
 */
export function getStripe(env: Env): Stripe {
  const secretKey = env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
    // Cloudflare Workers requires fetch-based HTTP client
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Create a payment intent for custom payment forms
 * Use this when: Building your own checkout UI with Stripe Elements
 * Returns: Payment intent with client_secret for frontend
 *
 * Example:
 * const paymentIntent = await createPaymentIntent(env, 2000, "usd"); // $20.00
 */
export async function createPaymentIntent(
  env: Env,
  amount: number,
  currency: string = "usd",
  metadata?: Record<string, string>
) {
  const stripe = getStripe(env);

  return await stripe.paymentIntents.create({
    amount, // Amount in cents (2000 = $20.00)
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Create a Stripe-hosted checkout session
 * Use this when: You want Stripe to handle the entire checkout page (no custom UI needed)
 * Returns: Checkout session with URL to redirect customer to
 *
 * Example:
 * const session = await createCheckoutSession(env, {
 *   amount: 2000, // $20.00
 *   successUrl: "https://mysite.com/success",
 *   cancelUrl: "https://mysite.com/cancel"
 * });
 * // Then redirect to session.url
 */
export async function createCheckoutSession(
  env: Env,
  options: {
    priceId?: string;
    amount?: number;
    currency?: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }
) {
  const stripe = getStripe(env);

  const lineItems = options.priceId
    ? [{ price: options.priceId, quantity: 1 }]
    : options.amount
    ? [
        {
          price_data: {
            currency: options.currency || "usd",
            product_data: {
              name: "Payment",
            },
            unit_amount: options.amount,
          },
          quantity: 1,
        },
      ]
    : [];

  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    customer_email: options.customerEmail,
    metadata: options.metadata,
  });
}

/**
 * Verify webhook signature for security
 * Use this when: Processing Stripe webhooks (payment confirmations, etc.)
 * Purpose: Ensures webhook is actually from Stripe, not attackers
 *
 * Example:
 * const event = constructWebhookEvent(env, rawBody, signature);
 * if (event.type === 'payment_intent.succeeded') { ... }
 */
export function constructWebhookEvent(
  env: Env,
  payload: string,
  signature: string
): Stripe.Event {
  const stripe = getStripe(env);
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
