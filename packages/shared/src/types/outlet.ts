export type OutletStatus = "active" | "setup" | "closed";

export interface Outlet {
  id: string;
  name: string;
  brand: string;
  address: string | null;
  phone: string | null;
  petpooja_restaurant_id: string | null;
  status: OutletStatus;
  gst_number: string | null;
  fssai_license: string | null;
  opened_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutletPhoto {
  id: string;
  outlet_id: string;
  storage_path: string;
  caption: string | null;
  is_cover: boolean;
  sort_order: number;
  uploaded_by: string | null;
  uploaded_at: string;
}
