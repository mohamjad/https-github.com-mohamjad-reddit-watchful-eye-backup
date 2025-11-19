import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
}

const Billing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();

    // Check for success or canceled params
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast({
        title: "Subscription activated!",
        description: "Your Pro subscription is now active. Welcome!",
        variant: "default",
      });
      // Refresh subscription data
      fetchSubscription();
      // Clean up URL
      navigate("/app/billing", { replace: true });
    } else if (canceled === "true") {
      toast({
        title: "Checkout canceled",
        description: "You canceled the checkout process. No charges were made.",
        variant: "default",
      });
      // Clean up URL
      navigate("/app/billing", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchSubscription = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      toast({
        title: "Error fetching subscription",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubscription(data);
    }
    setLoading(false);
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to subscribe",
          variant: "destructive",
        });
        return;
      }

      // Call the Stripe checkout Edge Function
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error starting checkout",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      });
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get subscription to find Stripe customer ID
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", session.user.id)
        .single();

      if (subscriptionData?.stripe_customer_id) {
        // Redirect to Stripe Customer Portal
        // You'll need to create a Stripe Customer Portal session
        // For now, we'll redirect to Stripe's billing portal
        toast({
          title: "Manage Subscription",
          description: "Redirecting to Stripe Customer Portal...",
          variant: "default",
        });

        // Call Edge Function to create portal session
        const { data, error } = await supabase.functions.invoke("stripe-portal", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          throw error;
        }

        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        toast({
          title: "No subscription found",
          description: "Please contact support if you believe this is an error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Manage subscription error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  const plan = {
    name: "Pro",
    price: "$39/mo",
    description: "Everything you need to find opportunities and validate ideas",
    features: [
      "Unlimited keywords",
      "Unlimited scans",
      "Automatic scans (configurable intervals)",
      "Reddit monitoring",
      "Smart match classification (Asking/Problems/Mentions)",
      "Pain points extraction",
      "Email alerts",
      "Dashboard with trends & insights",
      "Spam filtering",
    ],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {!loading && subscription && (
        <Card className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="text-xl font-semibold">
                    {subscription.plan === "free" ? "Free Trial" : `${plan.name} Plan`}
                  </h3>
                  <p className="text-muted-foreground">
                    Status: <span className="capitalize">{subscription.status}</span>
                  </p>
                  {subscription.current_period_end && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscription.plan === "free" ? "Trial expires" : "Renews"} on {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {subscription.plan !== "free" && (
              <Button variant="outline" onClick={handleManageSubscription}>
                Manage Subscription
              </Button>
            )}
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Subscription Plan</h2>
        <div className="max-w-2xl mx-auto">
          <Card
            className={`glass-card p-8 flex flex-col ${
              subscription?.plan !== "free" ? "border-primary border-2" : ""
            }`}
          >
            <div className="mb-6">
              <h3 className="text-3xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold mb-2">{plan.price}</div>
              {plan.description && (
                <p className="text-lg text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-base">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              {subscription?.plan !== "free" ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full gradient-primary" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;