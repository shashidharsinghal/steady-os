DO $$
BEGIN
  CREATE TYPE public.task_status AS ENUM (
    'open',
    'in_progress',
    'blocked',
    'done',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_criticality AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_area AS ENUM (
    'operations',
    'food',
    'accounts',
    'maintenance',
    'people',
    'vendors',
    'marketing',
    'compliance',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_assignee_type AS ENUM (
    'user',
    'role'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_role_assignee AS ENUM (
    'store_manager'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  area public.task_area NOT NULL DEFAULT 'operations',
  criticality public.task_criticality NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'open',
  assignee_type public.task_assignee_type NOT NULL DEFAULT 'user',
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_role public.task_role_assignee,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  completed_by uuid REFERENCES auth.users(id),
  due_date date,
  completed_at timestamptz,
  related_type text,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT tasks_title_not_blank
    CHECK (char_length(trim(title)) > 0),
  CONSTRAINT tasks_assignee_valid
    CHECK (
      (assignee_type = 'user' AND assignee_user_id IS NOT NULL AND assignee_role IS NULL)
      OR
      (assignee_type = 'role' AND assignee_user_id IS NULL AND assignee_role IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_tasks_outlet_status
  ON public.tasks (outlet_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user
  ON public.tasks (assignee_user_id, status, created_at DESC)
  WHERE deleted_at IS NULL AND assignee_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_role
  ON public.tasks (assignee_role, status, created_at DESC)
  WHERE deleted_at IS NULL AND assignee_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON public.tasks (due_date, status)
  WHERE deleted_at IS NULL AND due_date IS NOT NULL;

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE VIEW public.active_tasks AS
SELECT *
FROM public.tasks
WHERE deleted_at IS NULL;

GRANT SELECT ON public.active_tasks TO authenticated;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_members" ON public.tasks;
CREATE POLICY "tasks_select_members"
  ON public.tasks FOR SELECT
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = tasks.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_insert_members" ON public.tasks;
CREATE POLICY "tasks_insert_members"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = tasks.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_update_members" ON public.tasks;
CREATE POLICY "tasks_update_members"
  ON public.tasks FOR UPDATE
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = tasks.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = tasks.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_delete_partners" ON public.tasks;
CREATE POLICY "tasks_delete_partners"
  ON public.tasks FOR DELETE
  USING (public.is_partner());
