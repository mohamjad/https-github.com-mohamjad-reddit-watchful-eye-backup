import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: string;
  type: string;
  address: string;
  is_verified: boolean;
  created_at: string;
}

const Notifications = () => {
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<"email" | "slack">("email");
  const [newAddress, setNewAddress] = useState("");

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("notification_channels")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching channels",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  };

  const handleAddChannel = async () => {
    if (!newAddress.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("notification_channels").insert({
      user_id: session.user.id,
      type: newType,
      address: newAddress,
      is_verified: true,
    });

    if (error) {
      toast({
        title: "Error adding channel",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Channel added",
        description: "Your notification channel is now active.",
      });
      setNewAddress("");
      setDialogOpen(false);
      fetchChannels();
    }
  };

  const handleDeleteChannel = async (id: string) => {
    const { error } = await supabase.from("notification_channels").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting channel",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Channel deleted",
      });
      fetchChannels();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Channels</h1>
          <p className="text-muted-foreground mt-1">
            Manage how you receive alerts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Notification Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newType} onValueChange={(value: "email" | "slack") => setNewType(value)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">
                  {newType === "email" ? "Email Address" : "Slack Webhook URL"}
                </Label>
                <Input
                  id="address"
                  type={newType === "email" ? "email" : "url"}
                  placeholder={
                    newType === "email"
                      ? "you@example.com"
                      : "https://hooks.slack.com/..."
                  }
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>
              <Button onClick={handleAddChannel} className="w-full gradient-primary">
                Add Channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notification channels yet. Add one to start receiving alerts!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {channel.type === "email" ? (
                          <Mail className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        <span className="capitalize">{channel.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{channel.address}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        channel.is_verified
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary"
                      }`}>
                        {channel.is_verified ? "Verified" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(channel.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteChannel(channel.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Notifications;