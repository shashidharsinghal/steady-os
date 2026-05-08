CREATE TABLE public.inventory_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id             uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  item_name             text NOT NULL,
  category              text,
  variation             text,
  selling_price_paise   bigint NOT NULL CHECK (selling_price_paise >= 0),
  cost_to_prepare_paise bigint CHECK (cost_to_prepare_paise IS NULL OR cost_to_prepare_paise >= 0),
  current_stock         integer,
  reorder_level         integer,
  unit                  text NOT NULL DEFAULT 'pieces',
  is_active             boolean NOT NULL DEFAULT true,
  created_by            uuid REFERENCES auth.users(id),
  updated_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE UNIQUE INDEX idx_inventory_unique_active_item
  ON public.inventory_items (outlet_id, lower(item_name), lower(COALESCE(variation, '')))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_inventory_outlet_active
  ON public.inventory_items (outlet_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_inventory_outlet_category
  ON public.inventory_items (outlet_id, category)
  WHERE deleted_at IS NULL;

CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE VIEW public.active_inventory_items AS
  SELECT
    inventory_items.*,
    CASE
      WHEN inventory_items.cost_to_prepare_paise IS NULL OR inventory_items.selling_price_paise = 0 THEN NULL
      ELSE ROUND(
        (
          (inventory_items.selling_price_paise - inventory_items.cost_to_prepare_paise)::numeric
          / inventory_items.selling_price_paise
        ) * 100,
        2
      )
    END AS profit_margin_pct
  FROM public.inventory_items
  WHERE inventory_items.deleted_at IS NULL;

GRANT SELECT ON public.active_inventory_items TO authenticated;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_select_members"
  ON public.inventory_items FOR SELECT
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = inventory_items.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "inventory_items_all_partners"
  ON public.inventory_items FOR ALL
  USING (public.is_partner());
