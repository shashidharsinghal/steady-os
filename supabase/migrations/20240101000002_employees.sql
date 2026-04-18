-- Enums
CREATE TYPE public.employee_role AS ENUM ('manager', 'staff', 'cleaner');
CREATE TYPE public.employment_type AS ENUM ('full_time', 'part_time');
CREATE TYPE public.salary_change_reason AS ENUM ('joining', 'hike', 'demotion', 'correction');

-- employees
CREATE TABLE public.employees (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name                text          NOT NULL,
  phone                    text          NOT NULL,
  email                    text,
  address                  text,
  date_of_birth            date,
  joined_on                date          NOT NULL,
  left_on                  date,
  role                     public.employee_role NOT NULL,
  position                 text,
  employment_type          public.employment_type NOT NULL,
  reports_to               uuid          REFERENCES public.employees(id) ON DELETE SET NULL,
  current_outlet_id        uuid          REFERENCES public.outlets(id) ON DELETE SET NULL,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  aadhaar_last_4           char(4),
  archived_at              timestamptz,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT employees_aadhaar_last_4_format
    CHECK (aadhaar_last_4 IS NULL OR aadhaar_last_4 ~ '^[0-9]{4}$'),
  CONSTRAINT employees_left_on_after_joined_on
    CHECK (left_on IS NULL OR left_on >= joined_on)
);

CREATE INDEX employees_current_outlet_id_idx ON public.employees (current_outlet_id);
CREATE INDEX employees_user_id_idx ON public.employees (user_id);

CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- employee_outlet_assignments
CREATE TABLE public.employee_outlet_assignments (
  employee_id  uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  outlet_id    uuid        NOT NULL REFERENCES public.outlets(id)   ON DELETE CASCADE,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (employee_id, outlet_id)
);

CREATE INDEX employee_outlet_assignments_outlet_id_idx
  ON public.employee_outlet_assignments (outlet_id);

-- employee_salary_history  (append-only)
CREATE TABLE public.employee_salary_history (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  monthly_salary  numeric(10,2) NOT NULL,
  effective_from  date          NOT NULL,
  effective_to    date,
  reason          public.salary_change_reason NOT NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT employee_salary_history_amount_non_negative
    CHECK (monthly_salary >= 0),
  CONSTRAINT employee_salary_history_effective_range
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX employee_salary_history_employee_id_idx ON public.employee_salary_history (employee_id);
CREATE UNIQUE INDEX employee_salary_history_open_row_idx
  ON public.employee_salary_history (employee_id)
  WHERE effective_to IS NULL;

-- Trigger: when a new salary row is inserted, close the previous open row and
-- prevent backdated overlapping records from corrupting the timeline.
CREATE OR REPLACE FUNCTION public.prepare_employee_salary_history_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  previous_open_salary public.employee_salary_history%ROWTYPE;
BEGIN
  SELECT *
  INTO previous_open_salary
  FROM public.employee_salary_history
  WHERE employee_id = NEW.employee_id
    AND effective_to IS NULL
  ORDER BY effective_from DESC
  LIMIT 1
  FOR UPDATE;

  IF previous_open_salary.id IS NOT NULL THEN
    IF NEW.effective_from <= previous_open_salary.effective_from THEN
      RAISE EXCEPTION
        'Salary changes must be effective after the current open salary row'
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.employee_salary_history
    SET effective_to = NEW.effective_from - 1
    WHERE id = previous_open_salary.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prepare_employee_salary_history_insert
  BEFORE INSERT ON public.employee_salary_history
  FOR EACH ROW EXECUTE PROCEDURE public.prepare_employee_salary_history_insert();

-- Trigger: keep the primary outlet reflected in the multi-assignment table.
CREATE OR REPLACE FUNCTION public.sync_employee_primary_outlet_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_outlet_id IS NOT NULL THEN
    INSERT INTO public.employee_outlet_assignments (employee_id, outlet_id, assigned_by)
    VALUES (NEW.id, NEW.current_outlet_id, auth.uid())
    ON CONFLICT (employee_id, outlet_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_employee_primary_outlet_assignment
  AFTER INSERT OR UPDATE OF current_outlet_id ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE public.sync_employee_primary_outlet_assignment();

-- Trigger: if a primary outlet assignment is removed, clear the primary outlet.
CREATE OR REPLACE FUNCTION public.clear_removed_primary_outlet()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.employees
  SET current_outlet_id = NULL
  WHERE id = OLD.employee_id
    AND current_outlet_id = OLD.outlet_id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER clear_removed_primary_outlet
  AFTER DELETE ON public.employee_outlet_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.clear_removed_primary_outlet();

-- Enable RLS
ALTER TABLE public.employees                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_outlet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_history     ENABLE ROW LEVEL SECURITY;

-- employees RLS
CREATE POLICY "employees_select"
  ON public.employees FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.outlet_members
      WHERE outlet_members.outlet_id = employees.current_outlet_id
        AND outlet_members.user_id   = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.employee_outlet_assignments eoa
      JOIN public.outlet_members om ON om.outlet_id = eoa.outlet_id
      WHERE eoa.employee_id = employees.id
        AND om.user_id      = auth.uid()
    )
  );

CREATE POLICY "employees_insert"
  ON public.employees FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "employees_update"
  ON public.employees FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

-- employee_outlet_assignments RLS
CREATE POLICY "eoa_select"
  ON public.employee_outlet_assignments FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.outlet_members
      WHERE outlet_members.outlet_id = employee_outlet_assignments.outlet_id
        AND outlet_members.user_id   = auth.uid()
    )
  );

CREATE POLICY "eoa_insert"
  ON public.employee_outlet_assignments FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "eoa_delete"
  ON public.employee_outlet_assignments FOR DELETE
  USING (public.is_partner(auth.uid()));

-- employee_salary_history RLS (partner-only, append-only in UI)
CREATE POLICY "salary_select"
  ON public.employee_salary_history FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "salary_insert"
  ON public.employee_salary_history FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));
