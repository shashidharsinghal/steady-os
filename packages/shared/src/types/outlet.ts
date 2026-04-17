export type OutletStatus = "active" | "setup" | "closed";

export interface Outlet {
  id: string;
  name: string;
  brand: string;
  address: string | null;
  phone: string | null;
  petpooja_restaurant_id: string | null;
  status: OutletStatus;
  created_at: string;
  updated_at: string;
}
