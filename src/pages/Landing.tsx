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
            <span className="text-xl font-bold">AlertMe</span>
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
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-lg text-muted-foreground">Used by 500+</span>
            <RotatingText />
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Monitor Reddit and X for real problems. Validate your idea, discover features people want, and find your first customers.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gradient-primary">
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Three ways to win with AlertMe</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 glass-card hover:border-primary/50 transition-all">
            <Target className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-2xl font-semibold mb-3">Validate your idea</h3>
            <p className="text-muted-foreground leading-relaxed">
              See if anyone is actually asking for what you want to build. Search "need a CRM" and find 50 posts in the last week = validation.
            </p>
          </Card>
          <Card className="p-8 glass-card hover:border-primary/50 transition-all">
            <Sparkles className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-2xl font-semibold mb-3">Discover features</h3>
            <p className="text-muted-foreground leading-relaxed">
              Track "wish [your competitor] had X" to build what people actually want. Stop guessing, start building what's requested.
            </p>
          </Card>
          <Card className="p-8 glass-card hover:border-primary/50 transition-all">
            <Search className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-2xl font-semibold mb-3">Find customers</h3>
            <p className="text-muted-foreground leading-relaxed">
              Reply to people who need your product right now. Be there when they're searching for solutions.
            </p>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground text-lg">
            Start free, upgrade as you grow
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="p-8 glass-card flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold">$0</div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>1 keyword</span>
              </li>
            </ul>
            <Link to="/signup" className="mt-auto">
              <Button className="w-full" variant="outline">Get Started</Button>
            </Link>
          </Card>

          {/* Starter Plan */}
          <Card className="p-8 glass-card border-primary relative flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full gradient-primary text-sm font-medium text-white">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold">
                $9.99
                <span className="text-lg text-muted-foreground">/mo</span>
              </div>
              <p className="text-muted-foreground mt-2">Perfect for validating 1-2 ideas</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Reddit monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>3 keywords</span>
              </li>
            </ul>
            <Link to="/signup" className="mt-auto">
              <Button className="w-full gradient-primary">Get Started</Button>
            </Link>
          </Card>

          {/* Pro Plan */}
          <Card className="p-8 glass-card flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold">
                $15.99
                <span className="text-lg text-muted-foreground">/mo</span>
              </div>
              <p className="text-muted-foreground mt-2">For serious builders tracking competitors + finding leads</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Reddit + X monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>15 keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  Coming Soon
                </span>
              </li>
            </ul>
            <Button className="w-full mt-auto" variant="outline" disabled>
              Join Waitlist
            </Button>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24">
        <Card className="p-12 glass-card text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to never miss a mention?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses monitoring Reddit for opportunities
          </p>
          <Link to="/signup">
            <Button size="lg" className="gradient-primary">
              Start Free Trial
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© 2024 AlertMe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;