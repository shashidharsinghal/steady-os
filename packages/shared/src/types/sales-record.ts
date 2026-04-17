export type SalesChannel = "dine_in" | "zomato" | "swiggy" | "petpooja" | "other";

export interface SalesRecord {
  id: string;
  outlet_id: string;
  date: string;
  channel: SalesChannel;
  gross_sales: number;
  net_sales: number;
  order_count: number;
  source_file: string | null;
  created_at: string;
}
