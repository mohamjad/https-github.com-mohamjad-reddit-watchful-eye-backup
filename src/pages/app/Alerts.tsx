import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail } from "lucide-react";

const Alerts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Alerts</h1>
        <p className="text-muted-foreground">
          Manage how you receive notifications for your keyword matches
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Email Notifications</h3>
                <Badge variant="secondary">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Get instant email alerts when your keywords are matched on Reddit or X.
              </p>
              <p className="text-sm text-muted-foreground">
                Notifications are sent to your account email. Configure your keywords and sources to start receiving alerts.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-dashed">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Slack Integration</h3>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your Slack workspace to receive match notifications directly in your channels.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-dashed">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Webhook Integration</h3>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Send match data to your own API endpoints for custom integrations and workflows.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Alerts;
