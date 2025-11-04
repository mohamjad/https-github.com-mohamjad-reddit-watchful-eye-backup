import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
}

const Billing = () => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

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

  const plans = [
    {
      name: "Free",
      price: "$0",
      features: ["1 keyword", "5 alerts total", "All of Reddit"],
    },
    {
      name: "Basic",
      price: "$29/mo",
      features: ["5 keywords", "Unlimited alerts", "1 notification channel", "Email or Slack"],
    },
    {
      name: "Pro",
      price: "$79/mo",
      features: ["Unlimited keywords", "Unlimited alerts", "5 notification channels", "Priority support"],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {!loading && subscription && (
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="text-xl font-semibold capitalize">
                    {subscription.plan} Plan
                  </h3>
                  <p className="text-muted-foreground">
                    Status: <span className="capitalize">{subscription.status}</span>
                  </p>
                  {subscription.current_period_end && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {subscription.plan !== "free" && (
              <Button variant="outline">
                Manage Subscription
              </Button>
            )}
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`glass-card p-6 ${
                subscription?.plan.toLowerCase() === plan.name.toLowerCase()
                  ? "border-primary"
                  : ""
              }`}
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold">{plan.price}</div>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {subscription?.plan.toLowerCase() === plan.name.toLowerCase() ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button className="w-full gradient-primary">
                  {plan.name === "Free" ? "Downgrade" : "Upgrade"}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Billing;