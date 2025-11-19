import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    // Get the webhook signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature");
    }

    // Get the raw body
    const body = await req.text();

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        // Get the subscription from Stripe
        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error("No subscription ID in session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update subscription in database
        await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: subscription.customer as string,
            plan: "pro",
            status: subscription.status === "active" ? "active" : "past_due",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("user_id", userId);

        console.log(`Subscription created for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to find user by customer ID
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();

          if (!existingSub) {
            console.error("No user found for subscription");
            break;
          }

          userId = existingSub.user_id;
        }

        if (!userId) {
          console.error("No user ID found for subscription update");
          break;
        }

        // Update subscription in database
        await supabase
          .from("subscriptions")
          .update({
            plan: "pro",
            status: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("user_id", userId);

        console.log(`Subscription updated for user ${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to find user by customer ID
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();

          if (!existingSub) {
            console.error("No user found for subscription");
            break;
          }

          userId = existingSub.user_id;
        }

        if (!userId) {
          console.error("No user ID found for subscription deletion");
          break;
        }

        // Update subscription to canceled and downgrade to free
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          })
          .eq("user_id", userId);

        console.log(`Subscription canceled for user ${userId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        let userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to find user by customer ID
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();

          if (!existingSub) {
            console.error("No user found for subscription");
            break;
          }

          userId = existingSub.user_id;
        }

        if (!userId) {
          console.error("No user ID found for payment success");
          break;
        }

        // Update subscription period end
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("user_id", userId);

        console.log(`Payment succeeded for user ${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        let userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to find user by customer ID
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();

          if (!existingSub) {
            console.error("No user found for subscription");
            break;
          }

          userId = existingSub.user_id;
        }

        if (!userId) {
          console.error("No user ID found for payment failure");
          break;
        }

        // Update subscription status to past_due
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
          })
          .eq("user_id", userId);

        console.log(`Payment failed for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

