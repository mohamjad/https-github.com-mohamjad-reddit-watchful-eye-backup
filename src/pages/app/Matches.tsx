import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Match {
  id: number;
  title: string | null;
  body: string | null;
  url: string | null;
  author: string | null;
  subreddit: string | null;
  created_at_utc: string;
}

const Matches = () => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at_utc", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Error fetching matches",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMatches(data || []);
    }
    setLoading(false);
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Matches</h1>
        <p className="text-muted-foreground mt-1">
          Recent keyword matches from Reddit
        </p>
      </div>

      {loading ? (
        <Card className="glass-card p-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </Card>
      ) : matches.length === 0 ? (
        <Card className="glass-card p-8">
          <div className="text-center text-muted-foreground">
            No matches yet. Your keywords are being monitored!
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id} className="glass-card overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {match.subreddit && (
                        <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                          r/{match.subreddit}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(match.created_at_utc).toLocaleString()}
                      </span>
                    </div>
                    {match.title && (
                      <h3 className="text-lg font-semibold mb-2">{match.title}</h3>
                    )}
                    <p className="text-muted-foreground">
                      {expandedMatch === match.id
                        ? match.body
                        : truncateText(match.body, 200)}
                    </p>
                    {match.body && match.body.length > 200 && (
                      <Button
                        variant="link"
                        className="px-0 mt-2"
                        onClick={() =>
                          setExpandedMatch(expandedMatch === match.id ? null : match.id)
                        }
                      >
                        {expandedMatch === match.id ? "Show less" : "Show more"}
                      </Button>
                    )}
                  </div>
                  {match.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => window.open(match.url!, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  )}
                </div>
                {match.author && (
                  <div className="text-sm text-muted-foreground">
                    Posted by u/{match.author}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;