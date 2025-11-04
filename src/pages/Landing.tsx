import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Search, Zap, Shield, Target, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";

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
            <span className="text-xl font-bold">RedditAlert</span>
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
            Stop manually searching Reddit.
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">
              Get instant alerts.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Monitor keywords across Reddit in real-time. Get notified instantly when people 
            mention your product, competitors, or topics you care about.
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

      {/* Features Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need to monitor Reddit</h2>
          <p className="text-muted-foreground text-lg">
            Powerful features to catch every mention that matters
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <Search className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Keyword Tracking</h3>
            <p className="text-muted-foreground">
              Track exact phrases or use regex for advanced matching. Monitor specific subreddits or all of Reddit.
            </p>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <Bell className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Instant Notifications</h3>
            <p className="text-muted-foreground">
              Get alerts via email or Slack the moment your keywords are mentioned. Never miss an opportunity.
            </p>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <Zap className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
            <p className="text-muted-foreground">
              Our system checks Reddit continuously. Be the first to respond to relevant conversations.
            </p>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <Target className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Subreddit Filtering</h3>
            <p className="text-muted-foreground">
              Focus on specific communities or cast a wide net. Track posts and comments separately.
            </p>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <Shield className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">No API Limits</h3>
            <p className="text-muted-foreground">
              We handle all the Reddit API complexity. You just get the results you need.
            </p>
          </Card>
          <Card className="p-6 glass-card hover:border-primary/50 transition-all">
            <Sparkles className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Match History</h3>
            <p className="text-muted-foreground">
              Access your full history of matches. Filter by keyword, date, or subreddit.
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
          <Card className="p-8 glass-card">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold">$0</div>
              <p className="text-muted-foreground">Perfect to try it out</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>1 keyword</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>5 alerts total</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>All of Reddit</span>
              </li>
            </ul>
            <Link to="/signup">
              <Button className="w-full" variant="outline">Get Started</Button>
            </Link>
          </Card>

          {/* Basic Plan */}
          <Card className="p-8 glass-card border-primary relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full gradient-primary text-sm font-medium text-white">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Basic</h3>
              <div className="text-4xl font-bold">
                $29
                <span className="text-lg text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">For individuals</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>5 keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Unlimited alerts</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>1 notification channel</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Email or Slack</span>
              </li>
            </ul>
            <Link to="/signup">
              <Button className="w-full gradient-primary">Get Started</Button>
            </Link>
          </Card>

          {/* Pro Plan */}
          <Card className="p-8 glass-card">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold">
                $79
                <span className="text-lg text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">For teams</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Unlimited keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Unlimited alerts</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>5 notification channels</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Priority support</span>
              </li>
            </ul>
            <Link to="/signup">
              <Button className="w-full" variant="outline">Get Started</Button>
            </Link>
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
          <p>© 2024 RedditAlert. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;