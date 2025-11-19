import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Search, Zap, Shield, Target, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";
import RotatingText from "@/components/RotatingText";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Sift</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Real-time Reddit monitoring</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            They're already talking about your idea.
            <br />
            <span className="text-primary">
              You just don't know where.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track Reddit conversations in real-time to find opportunities, validate ideas, and catch trends before they explode.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gradient-primary text-lg px-8 py-6">
              Start Tracking Free
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">
            Find opportunities in 4 simple steps
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Add Keywords</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Monitor phrases like "looking for a CRM" or "need project management tool"
            </p>
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border border-border">
              <span className="text-xs text-muted-foreground">Screenshot: Keywords page</span>
            </div>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Matches</h3>
            <p className="text-sm text-muted-foreground mb-4">
              See only people asking for solutions or complaining about existing ones. No noise.
            </p>
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border border-border">
              <span className="text-xs text-muted-foreground">Screenshot: Matches with tabs</span>
            </div>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">See Trend Charts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Know if demand is rising, falling, or stable. Get historical context with 30-day charts.
            </p>
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border border-border">
              <span className="text-xs text-muted-foreground">Screenshot: Dashboard trends</span>
            </div>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary">4</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Alerts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Email notifications when demand spikes. Catch opportunities as they emerge.
            </p>
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border border-border">
              <span className="text-xs text-muted-foreground">Screenshot: Alert notifications</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground text-lg">
            Start with a free trial. Subscribe when you're ready to unlock unlimited features.
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <Card className="p-10 glass-card flex flex-col border-primary border-2">
            <div className="mb-8 text-center">
              <h3 className="text-3xl font-bold mb-2">Pro</h3>
              <div className="text-5xl font-bold mb-2">$39/mo</div>
              <p className="text-lg text-muted-foreground">
                Everything you need to find opportunities and validate ideas
              </p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Unlimited keywords</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Unlimited scans</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Automatic scans (configurable intervals)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Reddit monitoring</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Smart match classification (Asking/Problems/Mentions)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Pain points extraction</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Email alerts</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Dashboard with trends & insights</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base">Spam filtering</span>
              </li>
            </ul>
            <div className="mt-auto">
              <Link to="/signup">
                <Button className="w-full gradient-primary" size="lg">
                  Start Tracking Free
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Start with a free trial (5 keywords, 2 scans/day). Subscribe to unlock all features.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to find your next opportunity?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start tracking conversations that matter and discover opportunities before they explode.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gradient-primary text-lg px-8 py-6">
              Start Tracking Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Sift</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Sift. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
