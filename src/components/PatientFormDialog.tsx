import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;
type DoctorOption = { id: string; name: string };

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  doctors: DoctorOption[];
  onSuccess: () => void;
}

export function PatientFormDialog({ open, onOpenChange, patient, doctors, onSuccess }: PatientFormDialogProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setAge(patient.age);
      setGender(patient.gender);
      setContact(patient.contact);
      setDiagnosis(patient.diagnosis);
      setAssignedDoctorId(patient.assigned_doctor_id ?? "");
      setReportPreview(patient.report_image_url);
    } else {
      setName(""); setAge(0); setGender(""); setContact(""); setDiagnosis(""); setAssignedDoctorId(""); setReportPreview(null);
    }
    setReportFile(null);
  }, [patient, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportFile(file);
      setReportPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (age <= 0) { toast.error("Age must be positive"); return; }

    setLoading(true);
    let report_image_url = patient?.report_image_url ?? null;
    let report_image_path = patient?.report_image_path ?? null;

    if (reportFile) {
      if (report_image_path) {
        await supabase.storage.from("patient-reports").remove([report_image_path]);
      }
      const ext = reportFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("patient-reports").upload(filePath, reportFile);
      if (uploadError) {
        toast.error("Report upload failed: " + uploadError.message);
        setLoading(false);
        return;
      }
      // For private bucket, store path. URL will be generated via signed URL later.
      const { data: urlData } = supabase.storage.from("patient-reports").getPublicUrl(filePath);
      report_image_url = urlData.publicUrl;
      report_image_path = filePath;
    }

    const payload = {
      name,
      age,
      gender,
      contact,
      diagnosis,
      assigned_doctor_id: assignedDoctorId || null,
      report_image_url,
      report_image_path,
    };

    if (patient) {
      const { error } = await supabase.from("patients").update(payload).eq("id", patient.id);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Patient updated");
    } else {
      const { error } = await supabase.from("patients").insert(payload);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Patient added");
    }

    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{patient ? "Edit Patient" : "Add Patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Age *</Label>
              <Input type="number" min={1} value={age} onChange={(e) => setAge(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+1 234 567 890" />
          </div>
          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Type 2 Diabetes" />
          </div>
          <div className="space-y-2">
            <Label>Assigned Doctor</Label>
            <Select value={assignedDoctorId} onValueChange={setAssignedDoctorId}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Medical Report Image</Label>
            <div className="flex items-center gap-4">
              {reportPreview && (
                <img src={reportPreview} alt="Report" className="h-16 w-16 rounded-lg object-cover border" />
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                {reportFile ? reportFile.name : "Choose file"}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {patient ? "Update" : "Add"} Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
