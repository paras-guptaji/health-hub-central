import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, Stethoscope } from "lucide-react";
import { DoctorFormDialog } from "@/components/DoctorFormDialog";
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

type Doctor = Tables<"doctors">;

export default function Doctors() {
  const { role } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDoctors = async () => {
    setLoading(true);
    let query = supabase.from("doctors").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (search) {
      query = query.or(`name.ilike.%${search}%,specialization.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setDoctors(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const doctor = doctors.find((d) => d.id === deleteId);
    // Soft delete
    const { error } = await supabase.from("doctors").update({ deleted_at: new Date().toISOString() }).eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      // Delete image from storage if exists
      if (doctor?.image_path) {
        await supabase.storage.from("doctor-images").remove([doctor.image_path]);
      }
      toast.success("Doctor deleted successfully");
      fetchDoctors();
    }
    setDeleteId(null);
  };

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-muted-foreground">Manage your medical staff</p>
        </div>
        <Button onClick={() => { setEditingDoctor(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Doctor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search doctors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Stethoscope className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No doctors found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden">
                {doc.image_url ? (
                  <img src={doc.image_url} alt={doc.name} className="h-full w-full object-cover" />
                ) : (
                  <Stethoscope className="h-16 w-16 text-muted-foreground/30" />
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-lg">{doc.name}</h3>
                <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>{doc.email}</p>
                  <p>{doc.phone}</p>
                  <p>{doc.experience} years experience</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingDoctor(doc); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DoctorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        doctor={editingDoctor}
        onSuccess={fetchDoctors}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>This will remove the doctor from the active list. This action can be undone by an administrator.</AlertDialogDescription>
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
