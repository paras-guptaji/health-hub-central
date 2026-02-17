import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Doctor = Tables<"doctors">;
type Patient = Tables<"patients">;

export default function DeletedRecords() {
  const { role } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = async () => {
    setLoading(true);
    const [d, p] = await Promise.all([
      supabase.from("doctors").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("patients").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    ]);
    setDoctors(d.data ?? []);
    setPatients(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (role === "admin") fetchDeleted(); }, [role]);

  if (role !== "admin") return <Navigate to="/" replace />;

  const restoreDoctor = async (id: string) => {
    const { error } = await supabase.from("doctors").update({ deleted_at: null }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Doctor restored"); fetchDeleted(); }
  };

  const restorePatient = async (id: string) => {
    const { error } = await supabase.from("patients").update({ deleted_at: null }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Patient restored"); fetchDeleted(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trash2 className="h-6 w-6 text-destructive" /> Deleted Records</h1>
        <p className="text-muted-foreground">View and restore soft-deleted records</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="doctors">
          <TabsList>
            <TabsTrigger value="doctors">Doctors ({doctors.length})</TabsTrigger>
            <TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="doctors" className="space-y-2 mt-4">
            {doctors.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No deleted doctors.</CardContent></Card>
            ) : doctors.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.specialization} · Deleted {new Date(doc.deleted_at!).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreDoctor(doc.id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="patients" className="space-y-2 mt-4">
            {patients.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No deleted patients.</CardContent></Card>
            ) : patients.map((pat) => (
              <Card key={pat.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{pat.name}</p>
                    <p className="text-sm text-muted-foreground">{pat.diagnosis} · Deleted {new Date(pat.deleted_at!).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restorePatient(pat.id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
