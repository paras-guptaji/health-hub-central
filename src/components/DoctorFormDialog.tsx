import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Doctor = Tables<"doctors">;

interface DoctorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Doctor | null;
  onSuccess: () => void;
}

export function DoctorFormDialog({ open, onOpenChange, doctor, onSuccess }: DoctorFormDialogProps) {
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setSpecialization(doctor.specialization);
      setEmail(doctor.email);
      setPhone(doctor.phone);
      setExperience(doctor.experience);
      setImagePreview(doctor.image_url);
    } else {
      setName("");
      setSpecialization("");
      setEmail("");
      setPhone("");
      setExperience(0);
      setImagePreview(null);
    }
    setImageFile(null);
  }, [doctor, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }

    setLoading(true);
    let image_url = doctor?.image_url ?? null;
    let image_path = doctor?.image_path ?? null;

    // Upload image if a new file was selected
    if (imageFile) {
      // Remove old image if replacing
      if (image_path) {
        await supabase.storage.from("doctor-images").remove([image_path]);
      }
      const ext = imageFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("doctor-images").upload(filePath, imageFile);
      if (uploadError) {
        toast.error("Image upload failed: " + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("doctor-images").getPublicUrl(filePath);
      image_url = urlData.publicUrl;
      image_path = filePath;
    }

    const payload = { name, specialization, email, phone, experience, image_url, image_path };

    if (doctor) {
      const { error } = await supabase.from("doctors").update(payload).eq("id", doctor.id);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Doctor updated");
    } else {
      const { error } = await supabase.from("doctors").insert(payload);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Doctor added");
    }

    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{doctor ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" required />
          </div>
          <div className="space-y-2">
            <Label>Specialization</Label>
            <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Cardiology" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@hospital.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Experience (years)</Label>
            <Input type="number" min={0} value={experience} onChange={(e) => setExperience(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border" />
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Choose file"}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {doctor ? "Update" : "Add"} Doctor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
