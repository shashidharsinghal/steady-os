export type SalesChannel = "dine_in" | "takeaway" | "swiggy" | "zomato" | "other";
export type SalesStatus = "success" | "cancelled" | "refunded" | "partial";
export type PaymentMethod =
  | "cash"
  | "card"
  | "upi"
  | "wallet"
  | "online_aggregator"
  | "not_paid"
  | "part_payment"
  | "other";

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

export interface Customer {
  id: string;
  phone_hash: string | null;
  phone_last_4: string | null;
  name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  total_orders: number;
  total_spend_paise: number;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  marketing_opt_in_source: string | null;
  first_ingestion_run_id: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  outlet_id: string;
  source: string;
  source_order_id: string;
  channel: SalesChannel;
  order_type_raw: string | null;
  area_raw: string | null;
  sub_order_type_raw: string | null;
  status: SalesStatus;
  ordered_at: string;
  gross_amount_paise: number;
  discount_amount_paise: number;
  net_amount_paise: number;
  delivery_charge_paise: number;
  packaging_charge_paise: number;
  service_charge_paise: number;
  tax_amount_paise: number;
  round_off_paise: number;
  total_amount_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  gst_paid_by_merchant_paise: number;
  gst_paid_by_ecommerce_paise: number;
  aggregator_commission_paise: number | null;
  aggregator_fees_paise: number | null;
  aggregator_net_payout_paise: number | null;
  payment_method: PaymentMethod;
  payment_method_raw: string | null;
  customer_id: string | null;
  customer_name_raw: string | null;
  customer_phone_last_4: string | null;
  biller: string | null;
  kot_no: string | null;
  notes: string | null;
  ingestion_run_id: string;
  raw_data: unknown;
  created_at: string;
}

export interface SalesLineItem {
  id: string;
  order_id: string;
  item_name: string;
  category: string | null;
  quantity: number;
  unit_price_paise: number;
  discount_paise: number;
  tax_paise: number;
  line_total_paise: number;
  raw_data: unknown;
  ingestion_run_id: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  outlet_id: string;
  source: string;
  source_transaction_id: string;
  transaction_type: string;
  amount_paise: number;
  currency: string;
  transacted_at: string;
  status: string;
  card_issuer: string | null;
  card_network: string | null;
  card_last_4: string | null;
  is_contactless: boolean | null;
  is_emi: boolean | null;
  upi_vpa: string | null;
  upi_name: string | null;
  hardware_id: string | null;
  tid: string | null;
  mid: string | null;
  batch_no: string | null;
  customer_id: string | null;
  matched_order_id: string | null;
  match_confidence: string | null;
  matched_at: string | null;
  ingestion_run_id: string;
  raw_data: unknown;
  created_at: string;
}

export interface AggregatorPayout {
  id: string;
  outlet_id: string;
  source: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  cancelled_orders: number;
  item_total_paise: number;
  packaging_charges_paise: number;
  restaurant_discount_share_paise: number;
  gst_collected_paise: number;
  total_customer_paid_paise: number;
  commission_paise: number;
  payment_collection_paise: number;
  long_distance_paise: number;
  swiggy_one_fees_paise: number;
  pocket_hero_fees_paise: number;
  bolt_fees_paise: number;
  restaurant_cancellation_paise: number;
  call_center_paise: number;
  delivery_fee_sponsored_paise: number;
  other_fees_paise: number;
  gst_on_fees_paise: number;
  total_fees_paise: number;
  customer_cancellations_paise: number;
  customer_complaints_paise: number;
  gst_deduction_paise: number;
  tcs_paise: number;
  tds_paise: number;
  total_taxes_paise: number;
  net_payout_paise: number;
  settlement_date: string | null;
  adjustments_paise: number;
  adjustments_detail: unknown | null;
  ingestion_run_id: string;
  raw_data: unknown;
  created_at: string;
}
