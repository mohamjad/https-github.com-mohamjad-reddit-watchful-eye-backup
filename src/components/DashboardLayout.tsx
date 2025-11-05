import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, Search, Database, Mail, CreditCard, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    } else {
      setUserEmail(session.user.email || "");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
    navigate("/");
  };

  const navItems = [
    { icon: Bell, label: "Dashboard", path: "/app" },
    { icon: Search, label: "Keywords", path: "/app/keywords" },
    { icon: Database, label: "Sources", path: "/app/sources" },
    { icon: Bell, label: "Matches", path: "/app/matches" },
    { icon: Mail, label: "Notifications", path: "/app/notifications" },
    { icon: CreditCard, label: "Billing", path: "/app/billing" },
  ];

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 border-r border-border bg-sidebar overflow-hidden`}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">RedditAlert</span>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-sidebar-accent"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-sidebar-border">
          <div className="text-sm text-muted-foreground mb-2 truncate">
            {userEmail}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;