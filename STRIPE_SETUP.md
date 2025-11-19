# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe for your Reddit Watchful Eye application.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Supabase project
3. Access to your Stripe dashboard

## Step 1: Create a Product and Price in Stripe

1. Go to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Products** → **Add Product**
3. Create a product:
   - **Name**: Pro Plan
   - **Description**: Everything you need to find opportunities and validate ideas
   - **Pricing**: 
     - **Price**: $29.00
     - **Billing period**: Monthly (recurring)
   - Click **Save Product**

4. **Copy the Price ID** (starts with `price_...`) - you'll need this for the next step

## Step 2: Set Up Environment Variables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Environment Variables**
3. Add the following environment variables:

   - **STRIPE_SECRET_KEY**: Your Stripe Secret Key (starts with `sk_...`)
     - Get it from: Stripe Dashboard → Developers → API Keys → Secret key
     - Use the **Test key** for development, **Live key** for production
   
   - **STRIPE_PRICE_ID**: The Price ID you copied in Step 1 (starts with `price_...`)
   
   - **STRIPE_WEBHOOK_SECRET**: Your Stripe Webhook Secret (starts with `whsec_...`)
     - You'll get this after setting up the webhook (Step 4)
   
   - **SITE_URL**: Your site URL (e.g., `http://localhost:5173` for dev, `https://yourdomain.com` for production)

## Step 3: Deploy Edge Functions

Deploy the three Stripe Edge Functions to Supabase:

```bash
# Make sure you're in the project root
cd /path/to/reddit-watchful-eye

# Deploy stripe-checkout function
supabase functions deploy stripe-checkout

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook

# Deploy stripe-portal function
supabase functions deploy stripe-portal
```

Or deploy all at once:

```bash
supabase functions deploy stripe-checkout stripe-webhook stripe-portal
```

## Step 4: Set Up Stripe Webhook

1. Go to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** → **Webhooks** → **Add endpoint**
3. Set up the webhook:
   - **Endpoint URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
     - Replace `YOUR_PROJECT_REF` with your Supabase project reference
     - You can find it in your Supabase Dashboard URL or Project Settings
   
   - **Description**: Reddit Watchful Eye Webhook
   
   - **Events to send**: Select the following events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   
   - Click **Add endpoint**

4. **Copy the Webhook Signing Secret** (starts with `whsec_...`)
   - Click on the webhook endpoint you just created
   - Click **Reveal** next to "Signing secret"
   - Copy the secret

5. **Add the Webhook Secret to Supabase**:
   - Go to Supabase Dashboard → Edge Functions → Environment Variables
   - Add `STRIPE_WEBHOOK_SECRET` with the value you copied

## Step 5: Enable Stripe Customer Portal (Optional but Recommended)

1. Go to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Settings** → **Billing** → **Customer portal**
3. Enable the Customer Portal:
   - Toggle **Enable customer portal** to ON
   - Configure what customers can do:
     - ✅ Update payment method
     - ✅ Cancel subscription
     - ✅ Update billing information
   - Click **Save changes**

## Step 6: Test the Integration

### Test Mode (Development)

1. Make sure you're using Stripe **Test keys**:
   - Use test mode API keys from Stripe Dashboard
   - Use test mode webhook secret
   - Use test mode price ID (create a test product if needed)

2. Test the checkout flow:
   - Go to your app → Billing page
   - Click **Subscribe Now**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date, any CVC, any ZIP
   - Complete the checkout

3. Verify the subscription:
   - Check your Supabase database → `subscriptions` table
   - Verify `plan` is set to `pro`
   - Verify `stripe_customer_id` and `stripe_subscription_id` are set
   - Verify `status` is `active`

4. Test the webhook:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click on your webhook endpoint
   - Check the **Events** tab to see if events are being received
   - Check the **Logs** tab to see if requests are successful

### Production Mode

1. Switch to Stripe **Live keys**:
   - Update `STRIPE_SECRET_KEY` to live key
   - Update `STRIPE_PRICE_ID` to live price ID
   - Update `STRIPE_WEBHOOK_SECRET` to live webhook secret
   - Update `SITE_URL` to your production URL

2. Create a live webhook endpoint:
   - Create a new webhook endpoint in Stripe Dashboard
   - Use your production Supabase URL
   - Configure the same events as test mode
   - Copy the webhook secret and add it to Supabase

## Troubleshooting

### Checkout doesn't work

- **Check Edge Function logs**: Supabase Dashboard → Edge Functions → stripe-checkout → Logs
- **Verify environment variables**: Make sure all Stripe environment variables are set
- **Check Stripe API key**: Make sure you're using the correct key (test vs live)
- **Verify Price ID**: Make sure the Price ID exists in Stripe and matches your environment variable

### Webhook doesn't work

- **Check webhook URL**: Make sure it's correct and accessible
- **Verify webhook secret**: Make sure it matches the secret in Stripe Dashboard
- **Check webhook events**: Make sure you're listening to the correct events
- **Check Edge Function logs**: Supabase Dashboard → Edge Functions → stripe-webhook → Logs
- **Test webhook locally**: Use Stripe CLI to test webhooks locally:
  ```bash
  stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
  ```

### Subscription not updating in database

- **Check webhook logs**: Stripe Dashboard → Developers → Webhooks → Your endpoint → Logs
- **Check database permissions**: Make sure the Edge Function has permission to update the `subscriptions` table
- **Verify user_id**: Make sure the user_id is being passed correctly in metadata
- **Check Edge Function logs**: Supabase Dashboard → Edge Functions → stripe-webhook → Logs

### Customer Portal doesn't work

- **Verify Customer Portal is enabled**: Stripe Dashboard → Settings → Billing → Customer Portal
- **Check Edge Function logs**: Supabase Dashboard → Edge Functions → stripe-portal → Logs
- **Verify customer ID**: Make sure the user has a `stripe_customer_id` in the database

## Environment Variables Summary

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe API Secret Key | Stripe Dashboard → Developers → API Keys |
| `STRIPE_PRICE_ID` | Stripe Price ID | Stripe Dashboard → Products → Your Product → Price ID |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret | Stripe Dashboard → Developers → Webhooks → Your Endpoint |
| `SITE_URL` | Your site URL | Your application URL (e.g., `https://yourdomain.com`) |

## Next Steps

1. **Test thoroughly** in test mode before going live
2. **Monitor webhook events** in Stripe Dashboard
3. **Set up email notifications** for subscription events (optional)
4. **Test cancellation flow** to make sure it works correctly
5. **Test subscription renewal** to make sure it updates correctly

## Support

If you encounter any issues:
1. Check the Edge Function logs in Supabase Dashboard
2. Check the webhook logs in Stripe Dashboard
3. Check the database to see if subscriptions are being updated
4. Review the error messages in the console

For more help, refer to:
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)


