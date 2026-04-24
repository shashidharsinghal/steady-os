export type CustomerSegment =
  | "super_regular"
  | "regular"
  | "active"
  | "new"
  | "lapsed"
  | "churned"
  | "one_timer";

export type CustomerIdentityKind = "phone_hash" | "upi_vpa" | "card_fingerprint";

export interface CustomerIdentity {
  id: string;
  customer_id: string;
  kind: CustomerIdentityKind;
  value: string;
  display_value: string | null;
  first_seen_at: string;
  last_seen_at: string;
  observation_count: number;
  created_at: string;
}
