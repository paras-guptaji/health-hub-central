
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Doctors table
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  experience INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- 5. Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  diagnosis TEXT NOT NULL DEFAULT '',
  assigned_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  report_image_url TEXT,
  report_image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 6. Audit logs table
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_doctor_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'doctor')
$$;

CREATE OR REPLACE FUNCTION public.get_doctor_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.doctors WHERE user_id = _user_id AND deleted_at IS NULL LIMIT 1
$$;

-- 10. RLS Policies

-- Profiles: users see & update own profile, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- User roles: admins manage, users read own
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Doctors: admins full access, doctors see own (non-deleted)
CREATE POLICY "Admins can do anything with doctors" ON public.doctors FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Doctors can view own record" ON public.doctors FOR SELECT TO authenticated USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Patients: admins full access, doctors see/update their assigned (non-deleted)
CREATE POLICY "Admins can do anything with patients" ON public.patients FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Doctors can view assigned patients" ON public.patients FOR SELECT TO authenticated USING (assigned_doctor_id = public.get_doctor_id_for_user(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Doctors can update assigned patients" ON public.patients FOR UPDATE TO authenticated USING (assigned_doctor_id = public.get_doctor_id_for_user(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Doctors can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (public.is_doctor_user(auth.uid()));

-- Audit logs: admins read, authenticated insert
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 11. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-images', 'doctor-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-reports', 'patient-reports', false);

-- Storage policies for doctor-images (public read, authenticated write)
CREATE POLICY "Anyone can view doctor images" ON storage.objects FOR SELECT USING (bucket_id = 'doctor-images');
CREATE POLICY "Authenticated can upload doctor images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'doctor-images');
CREATE POLICY "Authenticated can update doctor images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'doctor-images');
CREATE POLICY "Authenticated can delete doctor images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'doctor-images');

-- Storage policies for patient-reports (only authenticated, role-checked)
CREATE POLICY "Auth users can view patient reports" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-reports');
CREATE POLICY "Auth users can upload patient reports" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-reports');
CREATE POLICY "Auth users can update patient reports" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'patient-reports');
CREATE POLICY "Auth users can delete patient reports" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-reports');
