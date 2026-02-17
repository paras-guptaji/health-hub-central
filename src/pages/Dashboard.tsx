import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Users, UserPlus, Loader2, Plus, Activity } from "lucide-react";

export default function Dashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ doctors: 0, patients: 0 });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const doctorsRes = await supabase.from("doctors").select("id", { count: "exact", head: true }).is("deleted_at", null);
      const patientsRes = await supabase.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null);
      const recentRes = await supabase.from("patients").select("id, name, diagnosis, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(5);
      setStats({ doctors: doctorsRes.count ?? 0, patients: patientsRes.count ?? 0 });
      setRecentPatients(recentRes.data ?? []);
      if (role === "admin") {
        const activityRes = await supabase.from("audit_logs").select("id, action, table_name, created_at").order("created_at", { ascending: false }).limit(5);
        setRecentActivity(activityRes.data ?? []);
      }
      setLoading(false);
    };
    fetchStats();
  }, [role]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const cards = [
    { title: "Total Doctors", value: stats.doctors, icon: Stethoscope, color: "text-primary" },
    { title: "Total Patients", value: stats.patients, icon: Users, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Healthcare Management System</p>
        </div>
        <div className="flex gap-2">
          {role === "admin" && (
            <Button size="sm" onClick={() => navigate("/doctors")}><Plus className="h-4 w-4 mr-1" /> Add Doctor</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate("/patients")}><Plus className="h-4 w-4 mr-1" /> Add Patient</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{card.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="h-5 w-5 text-primary" /> Recently Added Patients</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No patients added yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPatients.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.diagnosis}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-accent" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium text-sm">{a.action} <span className="text-muted-foreground capitalize">on {a.table_name}</span></p>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
