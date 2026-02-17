import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { PatientFormDialog } from "@/components/PatientFormDialog";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Patient = Tables<"patients">;
type DoctorOption = Pick<Tables<"doctors">, "id" | "name">;

export default function Patients() {
  const { role } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from("patients").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (search) {
      query = query.or(`name.ilike.%${search}%,diagnosis.ilike.%${search}%,contact.ilike.%${search}%`);
    }
    const [patientsRes, doctorsRes] = await Promise.all([
      query,
      supabase.from("doctors").select("id, name").is("deleted_at", null).order("name"),
    ]);
    if (patientsRes.error) toast.error(patientsRes.error.message);
    else setPatients(patientsRes.data ?? []);
    setDoctors(doctorsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const patient = patients.find((p) => p.id === deleteId);
    const { error } = await supabase.from("patients").update({ deleted_at: new Date().toISOString() }).eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      if (patient?.report_image_path) {
        await supabase.storage.from("patient-reports").remove([patient.report_image_path]);
      }
      toast.success("Patient deleted successfully");
      fetchData();
    }
    setDeleteId(null);
  };

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return "Unassigned";
    return doctors.find((d) => d.id === doctorId)?.name ?? "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground">Manage patient records</p>
        </div>
        <Button onClick={() => { setEditingPatient(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Patient
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No patients found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => (
            <Card key={patient.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{patient.name}</h3>
                    <p className="text-sm text-muted-foreground">{patient.age} yrs · {patient.gender}</p>
                  </div>
                  {patient.report_image_url && (
                    <img src={patient.report_image_url} alt="Report" className="h-10 w-10 rounded border object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium text-primary">{patient.diagnosis}</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>Contact: {patient.contact}</p>
                  <p>Doctor: {getDoctorName(patient.assigned_doctor_id)}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  {(role === "admin" || true) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setEditingPatient(patient); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      {role === "admin" && (
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(patient.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        doctors={doctors}
        onSuccess={fetchData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>This will remove the patient from active records. This action can be undone by an administrator.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
