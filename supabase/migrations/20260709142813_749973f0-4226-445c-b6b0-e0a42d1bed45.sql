
-- 1) First-user auto-admin trigger
CREATE OR REPLACE FUNCTION public.promote_first_user_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_promote_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_promote_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_first_user_to_admin();

-- 2) Admin RPC to set / revoke roles
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id uuid, _role app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Prevent removing the last admin
    IF _role = 'admin' AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'cannot remove the last admin';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO authenticated;

-- 3) Allow admins to read all profiles & user_roles for the Users tab
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Admin write policies on content tables
CREATE POLICY "Admins manage languages" ON public.languages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage levels" ON public.levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lesson_exercises" ON public.lesson_exercises FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage vocab_words" ON public.vocab_words FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage videos" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage placement_questions" ON public.placement_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Promote the earliest existing user to admin if there is none yet
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
