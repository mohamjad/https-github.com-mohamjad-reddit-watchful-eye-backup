import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Source {
  id: string;
  subreddit: string | null;
  include_comments: boolean;
  created_at: string;
}

const Sources = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubreddit, setNewSubreddit] = useState("");
  const [includeComments, setIncludeComments] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching sources",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSources(data || []);
    }
    setLoading(false);
  };

  const handleAddSource = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("sources").insert({
      user_id: session.user.id,
      subreddit: newSubreddit.trim() || null,
      include_comments: includeComments,
    });

    if (error) {
      toast({
        title: "Error adding source",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Source added",
        description: newSubreddit ? `Now monitoring r/${newSubreddit}` : "Now monitoring all of Reddit",
      });
      setNewSubreddit("");
      setIncludeComments(true);
      setDialogOpen(false);
      fetchSources();
    }
  };

  const handleDeleteSource = async (id: string) => {
    const { error } = await supabase.from("sources").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting source",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Source deleted",
      });
      fetchSources();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sources</h1>
          <p className="text-muted-foreground mt-1">
            Manage the subreddits you're monitoring
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="subreddit">Subreddit (optional)</Label>
                <Input
                  id="subreddit"
                  placeholder="Leave blank for all of Reddit"
                  value={newSubreddit}
                  onChange={(e) => setNewSubreddit(e.target.value.replace(/^r\//, ""))}
                />
                <p className="text-xs text-muted-foreground">
                  Enter without r/ prefix (e.g., "technology")
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comments"
                  checked={includeComments}
                  onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                />
                <Label htmlFor="comments" className="cursor-pointer">
                  Include comments
                </Label>
              </div>
              <Button onClick={handleAddSource} className="w-full gradient-primary">
                Add Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sources yet. Add a source to start monitoring!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subreddit</TableHead>
                  <TableHead>Include Comments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">
                      {source.subreddit ? `r/${source.subreddit}` : "All of Reddit"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        source.include_comments ? "bg-primary/20 text-primary" : "bg-secondary"
                      }`}>
                        {source.include_comments ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(source.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSource(source.id)}
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

export default Sources;