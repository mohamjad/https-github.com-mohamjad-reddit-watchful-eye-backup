import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Keyword {
  id: string;
  phrase: string;
  is_regex: boolean;
  created_at: string;
}

const Keywords = () => {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [plan, setPlan] = useState("free");
  const [keywordLimit, setKeywordLimit] = useState(1);
  const [scansRemaining, setScansRemaining] = useState(2);
  const [nextReset, setNextReset] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchKeywords();
    fetchSubscription();
    calculateNextReset();
  }, []);

  const calculateNextReset = () => {
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const tomorrow = new Date(est);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setNextReset(tomorrow);
  };

  const fetchSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      setPlan(data.plan);
      setKeywordLimit(data.plan === "free" ? 1 : data.plan === "basic" ? 5 : 999);
    }
  };

  const fetchKeywords = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("keywords")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching keywords",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setKeywords(data || []);
    }
    setLoading(false);
  };

  const handleAddKeyword = async () => {
    if (!newPhrase.trim()) return;

    if (keywords.length >= keywordLimit) {
      toast({
        title: "Limit reached",
        description: `You can only have ${keywordLimit} keyword(s) on the ${plan} plan.`,
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("keywords").insert({
      user_id: session.user.id,
      phrase: newPhrase,
      is_regex: isRegex,
    });

    if (error) {
      toast({
        title: "Error adding keyword",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Keyword added",
        description: "Your keyword is now being monitored.",
      });
      setNewPhrase("");
      setIsRegex(false);
      setDialogOpen(false);
      fetchKeywords();
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    const { error } = await supabase.from("keywords").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting keyword",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Keyword deleted",
      });
      fetchKeywords();
    }
  };

  const handleManualScan = async () => {
    if (plan === "free" && scansRemaining <= 0) {
      toast({
        title: "Scan limit reached",
        description: `Next scan available at ${nextReset?.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })} EST`,
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    // Simulate scan - backend will handle actual logic
    setTimeout(() => {
      if (plan === "free") {
        setScansRemaining(prev => Math.max(0, prev - 1));
      }
      toast({
        title: "Scan initiated",
        description: "Checking for new matches...",
      });
      setScanning(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Keywords</h1>
          <p className="text-muted-foreground mt-1">
            Manage the keywords you're monitoring
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {plan === "free" && (
            <div className="text-sm text-muted-foreground">
              {scansRemaining} / 2 scans remaining
              <div className="text-xs">Resets at midnight EST</div>
            </div>
          )}
          <Button 
            onClick={handleManualScan} 
            disabled={scanning || (plan === "free" && scansRemaining <= 0)}
            variant="outline"
          >
            <Search className="w-4 h-4 mr-2" />
            {scanning ? "Scanning..." : "Scan Now"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Keyword
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Keyword</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="phrase">Phrase</Label>
                <Input
                  id="phrase"
                  placeholder="e.g., looking for a CRM"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="regex"
                  checked={isRegex}
                  onCheckedChange={(checked) => setIsRegex(checked as boolean)}
                />
                <Label htmlFor="regex" className="cursor-pointer">
                  Use regex pattern
                </Label>
              </div>
              <Button onClick={handleAddKeyword} className="w-full gradient-primary">
                Add Keyword
              </Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass-card">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {keywords.length} / {keywordLimit === 999 ? "∞" : keywordLimit} keywords used
            </div>
            {keywords.length >= keywordLimit && keywordLimit !== 999 && (
              <Button variant="outline" size="sm">
                Upgrade Plan
              </Button>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No keywords yet. Add your first keyword to start monitoring!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phrase</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">{keyword.phrase}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-secondary text-xs">
                        {keyword.is_regex ? "Regex" : "Exact"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(keyword.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteKeyword(keyword.id)}
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

export default Keywords;