import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, FileText } from "lucide-react";
import { Navigate } from "react-router-dom";

interface AuditLog {
  id: number;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  user_id: string | null;
}

export default function AuditLogs() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "admin") return;
    const fetch = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, table_name, record_id, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data as AuditLog[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [role]);

  if (role !== "admin") return <Navigate to="/" replace />;

  const actionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-success/10 text-success border-success/20";
      case "UPDATE": return "bg-info/10 text-info border-info/20";
      case "SOFT_DELETE": return "bg-warning/10 text-warning border-warning/20";
      case "DELETE": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Audit Logs</h1>
        <p className="text-muted-foreground">Track all system activity</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />No activity recorded yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={actionColor(log.action)}>{log.action}</Badge>
                  <div>
                    <p className="text-sm font-medium capitalize">{log.table_name}</p>
                    <p className="text-xs text-muted-foreground">{log.record_id?.slice(0, 8)}...</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
