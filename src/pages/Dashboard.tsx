import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, UserPlus, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { role } = useAuth();
  const [stats, setStats] = useState({ doctors: 0, patients: 0 });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [doctorsRes, patientsRes, recentRes] = await Promise.all([
        supabase.from("doctors").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("patients").select("id, name, diagnosis, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        doctors: doctorsRes.count ?? 0,
        patients: patientsRes.count ?? 0,
      });
      setRecentPatients(recentRes.data ?? []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { title: "Total Doctors", value: stats.doctors, icon: Stethoscope, color: "text-primary" },
    { title: "Total Patients", value: stats.patients, icon: Users, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Healthcare Management System</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Recently Added Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPatients.length === 0 ? (
            <p className="text-muted-foreground text-sm">No patients added yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.diagnosis}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
