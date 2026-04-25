export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      outlets: {
        Row: {
          id: string;
          name: string;
          brand: string;
          address: string | null;
          phone: string | null;
          petpooja_restaurant_id: string | null;
          status: "active" | "setup" | "closed";
          gst_number: string | null;
          fssai_license: string | null;
          opened_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand: string;
          address?: string | null;
          phone?: string | null;
          petpooja_restaurant_id?: string | null;
          status?: "active" | "setup" | "closed";
          gst_number?: string | null;
          fssai_license?: string | null;
          opened_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand?: string;
          address?: string | null;
          phone?: string | null;
          petpooja_restaurant_id?: string | null;
          status?: "active" | "setup" | "closed";
          gst_number?: string | null;
          fssai_license?: string | null;
          opened_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: never[];
      };
      employees: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          address: string | null;
          date_of_birth: string | null;
          joined_on: string;
          left_on: string | null;
          role: "manager" | "staff" | "cleaner";
          position: string | null;
          employment_type: "full_time" | "part_time";
          reports_to: string | null;
          current_outlet_id: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          aadhaar_last_4: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          phone: string;
          email?: string | null;
          address?: string | null;
          date_of_birth?: string | null;
          joined_on: string;
          left_on?: string | null;
          role: "manager" | "staff" | "cleaner";
          position?: string | null;
          employment_type: "full_time" | "part_time";
          reports_to?: string | null;
          current_outlet_id?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          aadhaar_last_4?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          full_name?: string;
          phone?: string;
          email?: string | null;
          address?: string | null;
          date_of_birth?: string | null;
          joined_on?: string;
          left_on?: string | null;
          role?: "manager" | "staff" | "cleaner";
          position?: string | null;
          employment_type?: "full_time" | "part_time";
          reports_to?: string | null;
          current_outlet_id?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          aadhaar_last_4?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: never[];
      };
      employee_outlet_assignments: {
        Row: {
          employee_id: string;
          outlet_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          employee_id: string;
          outlet_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          employee_id?: string;
          outlet_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Relationships: never[];
      };
      employee_salary_history: {
        Row: {
          id: string;
          employee_id: string;
          monthly_salary: number;
          effective_from: string;
          effective_to: string | null;
          reason: "joining" | "hike" | "demotion" | "correction";
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          monthly_salary: number;
          effective_from: string;
          effective_to?: string | null;
          reason: "joining" | "hike" | "demotion" | "correction";
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          employee_id?: string;
          monthly_salary?: number;
          effective_from?: string;
          effective_to?: string | null;
          reason?: "joining" | "hike" | "demotion" | "correction";
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: never[];
      };
      outlet_members: {
        Row: {
          outlet_id: string;
          user_id: string;
          role: "partner" | "manager";
          created_at: string;
        };
        Insert: {
          outlet_id: string;
          user_id: string;
          role: "partner" | "manager";
          created_at?: string;
        };
        Update: {
          outlet_id?: string;
          user_id?: string;
          role?: "partner" | "manager";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outlet_members_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outlet_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ingestion_runs: {
        Row: {
          id: string;
          outlet_id: string | null;
          uploaded_by: string;
          uploaded_at: string;
          source_type: string;
          detection_method:
            | "filename_pattern"
            | "header_inspection"
            | "content_llm"
            | "user_override";
          detection_confidence: number | null;
          user_confirmed_source: boolean;
          file_name: string;
          file_size_bytes: number;
          file_mime_type: string | null;
          file_storage_path: string;
          file_sha256: string | null;
          status:
            | "uploaded"
            | "parsing"
            | "preview_ready"
            | "committing"
            | "committed"
            | "rolled_back"
            | "failed"
            | "purged";
          parsing_started_at: string | null;
          parsing_completed_at: string | null;
          committing_started_at: string | null;
          committed_at: string | null;
          rolled_back_at: string | null;
          failed_at: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          purge_scheduled_at: string | null;
          rows_seen: number | null;
          rows_parsed: number | null;
          rows_to_insert: number | null;
          rows_duplicate: number | null;
          rows_errored: number | null;
          preview_payload: Json | null;
          error_details: Json | null;
          committed_by: string | null;
          rolled_back_by: string | null;
          rollback_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outlet_id?: string | null;
          uploaded_by: string;
          uploaded_at?: string;
          source_type: string;
          detection_method:
            | "filename_pattern"
            | "header_inspection"
            | "content_llm"
            | "user_override";
          detection_confidence?: number | null;
          user_confirmed_source?: boolean;
          file_name: string;
          file_size_bytes: number;
          file_mime_type?: string | null;
          file_storage_path: string;
          file_sha256: string | null;
          status?:
            | "uploaded"
            | "parsing"
            | "preview_ready"
            | "committing"
            | "committed"
            | "rolled_back"
            | "failed"
            | "purged";
          parsing_started_at?: string | null;
          parsing_completed_at?: string | null;
          committing_started_at?: string | null;
          committed_at?: string | null;
          rolled_back_at?: string | null;
          failed_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          rows_seen?: number | null;
          rows_parsed?: number | null;
          rows_to_insert?: number | null;
          rows_duplicate?: number | null;
          rows_errored?: number | null;
          preview_payload?: Json | null;
          error_details?: Json | null;
          committed_by?: string | null;
          rolled_back_by?: string | null;
          rollback_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string | null;
          uploaded_by?: string;
          uploaded_at?: string;
          source_type?: string;
          detection_method?:
            | "filename_pattern"
            | "header_inspection"
            | "content_llm"
            | "user_override";
          detection_confidence?: number | null;
          user_confirmed_source?: boolean;
          file_name?: string;
          file_size_bytes?: number;
          file_mime_type?: string | null;
          file_storage_path?: string;
          file_sha256?: string | null;
          status?:
            | "uploaded"
            | "parsing"
            | "preview_ready"
            | "committing"
            | "committed"
            | "rolled_back"
            | "failed"
            | "purged";
          parsing_started_at?: string | null;
          parsing_completed_at?: string | null;
          committing_started_at?: string | null;
          committed_at?: string | null;
          rolled_back_at?: string | null;
          failed_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          rows_seen?: number | null;
          rows_parsed?: number | null;
          rows_to_insert?: number | null;
          rows_duplicate?: number | null;
          rows_errored?: number | null;
          preview_payload?: Json | null;
          error_details?: Json | null;
          committed_by?: string | null;
          rolled_back_by?: string | null;
          rollback_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_runs_deleted_by_fkey";
            columns: ["deleted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ingestion_row_errors: {
        Row: {
          id: string;
          run_id: string;
          row_number: number;
          error_code: string;
          error_message: string;
          field_name: string | null;
          raw_value: string | null;
          raw_row: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          row_number: number;
          error_code: string;
          error_message: string;
          field_name?: string | null;
          raw_value?: string | null;
          raw_row?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          row_number?: number;
          error_code?: string;
          error_message?: string;
          field_name?: string | null;
          raw_value?: string | null;
          raw_row?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_row_errors_run_id_fkey";
            columns: ["run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      outlet_photos: {
        Row: {
          id: string;
          outlet_id: string;
          storage_path: string;
          caption: string | null;
          is_cover: boolean;
          sort_order: number;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          storage_path: string;
          caption?: string | null;
          is_cover?: boolean;
          sort_order: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          storage_path?: string;
          caption?: string | null;
          is_cover?: boolean;
          sort_order?: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outlet_photos_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outlet_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
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
        };
        Insert: {
          id?: string;
          phone_hash?: string | null;
          phone_last_4?: string | null;
          name?: string | null;
          first_seen_at: string;
          last_seen_at: string;
          total_orders?: number;
          total_spend_paise?: number;
          marketing_opt_in?: boolean;
          marketing_opt_in_at?: string | null;
          marketing_opt_in_source?: string | null;
          first_ingestion_run_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_hash?: string | null;
          phone_last_4?: string | null;
          name?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          total_orders?: number;
          total_spend_paise?: number;
          marketing_opt_in?: boolean;
          marketing_opt_in_at?: string | null;
          marketing_opt_in_source?: string | null;
          first_ingestion_run_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_first_ingestion_run_id_fkey";
            columns: ["first_ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_identities: {
        Row: {
          id: string;
          customer_id: string;
          kind: Database["public"]["Enums"]["identity_kind"];
          value: string;
          display_value: string | null;
          first_seen_at: string;
          last_seen_at: string;
          observation_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          kind: Database["public"]["Enums"]["identity_kind"];
          value: string;
          display_value?: string | null;
          first_seen_at: string;
          last_seen_at: string;
          observation_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          kind?: Database["public"]["Enums"]["identity_kind"];
          value?: string;
          display_value?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          observation_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_identities_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_merges: {
        Row: {
          id: string;
          primary_customer_id: string;
          secondary_customer_id: string;
          merged_by: string;
          reason: string | null;
          merged_at: string;
          undo_available_until: string;
          secondary_snapshot: Json;
          restored_at: string | null;
          restored_by: string | null;
        };
        Insert: {
          id?: string;
          primary_customer_id: string;
          secondary_customer_id: string;
          merged_by: string;
          reason?: string | null;
          merged_at?: string;
          undo_available_until?: string;
          secondary_snapshot?: Json;
          restored_at?: string | null;
          restored_by?: string | null;
        };
        Update: {
          id?: string;
          primary_customer_id?: string;
          secondary_customer_id?: string;
          merged_by?: string;
          reason?: string | null;
          merged_at?: string;
          undo_available_until?: string;
          secondary_snapshot?: Json;
          restored_at?: string | null;
          restored_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_merges_merged_by_fkey";
            columns: ["merged_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_merges_primary_customer_id_fkey";
            columns: ["primary_customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_merges_restored_by_fkey";
            columns: ["restored_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_merges_secondary_customer_id_fkey";
            columns: ["secondary_customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_dismissed_matches: {
        Row: {
          id: string;
          customer_a_id: string;
          customer_b_id: string;
          dismissed_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_a_id: string;
          customer_b_id: string;
          dismissed_by: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_a_id?: string;
          customer_b_id?: string;
          dismissed_by?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_dismissed_matches_customer_a_id_fkey";
            columns: ["customer_a_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_dismissed_matches_customer_b_id_fkey";
            columns: ["customer_b_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_dismissed_matches_dismissed_by_fkey";
            columns: ["dismissed_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_orders: {
        Row: {
          id: string;
          outlet_id: string;
          source: string;
          source_order_id: string;
          channel: Database["public"]["Enums"]["sales_channel"];
          order_type_raw: string | null;
          area_raw: string | null;
          sub_order_type_raw: string | null;
          status: Database["public"]["Enums"]["sales_status"];
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
          settlement_status: Database["public"]["Enums"]["settlement_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_method_raw: string | null;
          customer_id: string | null;
          customer_name_raw: string | null;
          customer_phone_last_4: string | null;
          biller: string | null;
          kot_no: string | null;
          notes: string | null;
          ingestion_run_id: string;
          raw_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          source: string;
          source_order_id: string;
          channel: Database["public"]["Enums"]["sales_channel"];
          order_type_raw?: string | null;
          area_raw?: string | null;
          sub_order_type_raw?: string | null;
          status: Database["public"]["Enums"]["sales_status"];
          ordered_at: string;
          gross_amount_paise: number;
          discount_amount_paise?: number;
          net_amount_paise: number;
          delivery_charge_paise?: number;
          packaging_charge_paise?: number;
          service_charge_paise?: number;
          tax_amount_paise?: number;
          round_off_paise?: number;
          total_amount_paise: number;
          cgst_paise?: number;
          sgst_paise?: number;
          igst_paise?: number;
          gst_paid_by_merchant_paise?: number;
          gst_paid_by_ecommerce_paise?: number;
          aggregator_commission_paise?: number | null;
          aggregator_fees_paise?: number | null;
          aggregator_net_payout_paise?: number | null;
          settlement_status?: Database["public"]["Enums"]["settlement_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_method_raw?: string | null;
          customer_id?: string | null;
          customer_name_raw?: string | null;
          customer_phone_last_4?: string | null;
          biller?: string | null;
          kot_no?: string | null;
          notes?: string | null;
          ingestion_run_id: string;
          raw_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          source?: string;
          source_order_id?: string;
          channel?: Database["public"]["Enums"]["sales_channel"];
          order_type_raw?: string | null;
          area_raw?: string | null;
          sub_order_type_raw?: string | null;
          status?: Database["public"]["Enums"]["sales_status"];
          ordered_at?: string;
          gross_amount_paise?: number;
          discount_amount_paise?: number;
          net_amount_paise?: number;
          delivery_charge_paise?: number;
          packaging_charge_paise?: number;
          service_charge_paise?: number;
          tax_amount_paise?: number;
          round_off_paise?: number;
          total_amount_paise?: number;
          cgst_paise?: number;
          sgst_paise?: number;
          igst_paise?: number;
          gst_paid_by_merchant_paise?: number;
          gst_paid_by_ecommerce_paise?: number;
          aggregator_commission_paise?: number | null;
          aggregator_fees_paise?: number | null;
          aggregator_net_payout_paise?: number | null;
          settlement_status?: Database["public"]["Enums"]["settlement_status"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_method_raw?: string | null;
          customer_id?: string | null;
          customer_name_raw?: string | null;
          customer_phone_last_4?: string | null;
          biller?: string | null;
          kot_no?: string | null;
          notes?: string | null;
          ingestion_run_id?: string;
          raw_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_line_items: {
        Row: {
          id: string;
          order_id: string;
          item_name: string;
          category: string | null;
          quantity: number;
          unit_price_paise: number;
          discount_paise: number;
          tax_paise: number;
          line_total_paise: number;
          raw_data: Json;
          ingestion_run_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          item_name: string;
          category?: string | null;
          quantity: number;
          unit_price_paise: number;
          discount_paise?: number;
          tax_paise?: number;
          line_total_paise: number;
          raw_data: Json;
          ingestion_run_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          item_name?: string;
          category?: string | null;
          quantity?: number;
          unit_price_paise?: number;
          discount_paise?: number;
          tax_paise?: number;
          line_total_paise?: number;
          raw_data?: Json;
          ingestion_run_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_line_items_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_line_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_transactions: {
        Row: {
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
          raw_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          source: string;
          source_transaction_id: string;
          transaction_type: string;
          amount_paise: number;
          currency?: string;
          transacted_at: string;
          status: string;
          card_issuer?: string | null;
          card_network?: string | null;
          card_last_4?: string | null;
          is_contactless?: boolean | null;
          is_emi?: boolean | null;
          upi_vpa?: string | null;
          upi_name?: string | null;
          hardware_id?: string | null;
          tid?: string | null;
          mid?: string | null;
          batch_no?: string | null;
          customer_id?: string | null;
          matched_order_id?: string | null;
          match_confidence?: string | null;
          matched_at?: string | null;
          ingestion_run_id: string;
          raw_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          source?: string;
          source_transaction_id?: string;
          transaction_type?: string;
          amount_paise?: number;
          currency?: string;
          transacted_at?: string;
          status?: string;
          card_issuer?: string | null;
          card_network?: string | null;
          card_last_4?: string | null;
          is_contactless?: boolean | null;
          is_emi?: boolean | null;
          upi_vpa?: string | null;
          upi_name?: string | null;
          hardware_id?: string | null;
          tid?: string | null;
          mid?: string | null;
          batch_no?: string | null;
          customer_id?: string | null;
          matched_order_id?: string | null;
          match_confidence?: string | null;
          matched_at?: string | null;
          ingestion_run_id?: string;
          raw_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_transactions_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_matched_order_id_fkey";
            columns: ["matched_order_id"];
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      aggregator_payouts: {
        Row: {
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
          adjustments_detail: Json | null;
          ingestion_run_id: string;
          raw_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          source: string;
          period_start: string;
          period_end: string;
          total_orders: number;
          cancelled_orders?: number;
          item_total_paise: number;
          packaging_charges_paise?: number;
          restaurant_discount_share_paise?: number;
          gst_collected_paise?: number;
          total_customer_paid_paise: number;
          commission_paise?: number;
          payment_collection_paise?: number;
          long_distance_paise?: number;
          swiggy_one_fees_paise?: number;
          pocket_hero_fees_paise?: number;
          bolt_fees_paise?: number;
          restaurant_cancellation_paise?: number;
          call_center_paise?: number;
          delivery_fee_sponsored_paise?: number;
          other_fees_paise?: number;
          gst_on_fees_paise?: number;
          total_fees_paise: number;
          customer_cancellations_paise?: number;
          customer_complaints_paise?: number;
          gst_deduction_paise?: number;
          tcs_paise?: number;
          tds_paise?: number;
          total_taxes_paise: number;
          net_payout_paise: number;
          settlement_date?: string | null;
          adjustments_paise?: number;
          adjustments_detail?: Json | null;
          ingestion_run_id: string;
          raw_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          source?: string;
          period_start?: string;
          period_end?: string;
          total_orders?: number;
          cancelled_orders?: number;
          item_total_paise?: number;
          packaging_charges_paise?: number;
          restaurant_discount_share_paise?: number;
          gst_collected_paise?: number;
          total_customer_paid_paise?: number;
          commission_paise?: number;
          payment_collection_paise?: number;
          long_distance_paise?: number;
          swiggy_one_fees_paise?: number;
          pocket_hero_fees_paise?: number;
          bolt_fees_paise?: number;
          restaurant_cancellation_paise?: number;
          call_center_paise?: number;
          delivery_fee_sponsored_paise?: number;
          other_fees_paise?: number;
          gst_on_fees_paise?: number;
          total_fees_paise?: number;
          customer_cancellations_paise?: number;
          customer_complaints_paise?: number;
          gst_deduction_paise?: number;
          tcs_paise?: number;
          tds_paise?: number;
          total_taxes_paise?: number;
          net_payout_paise?: number;
          settlement_date?: string | null;
          adjustments_paise?: number;
          adjustments_detail?: Json | null;
          ingestion_run_id?: string;
          raw_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aggregator_payouts_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aggregator_payouts_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      pnl_reports: {
        Row: {
          id: string;
          outlet_id: string;
          period_start: string;
          period_end: string;
          entity_name: string | null;
          store_name: string | null;
          gross_sales_paise: number;
          trade_discount_paise: number;
          net_sales_paise: number;
          dine_in_sales_paise: number;
          swiggy_sales_paise: number;
          zomato_sales_paise: number;
          other_online_sales_paise: number;
          opening_stock_paise: number;
          purchases_paise: number;
          closing_stock_paise: number;
          cogs_paise: number;
          gross_profit_paise: number;
          total_expenses_paise: number;
          miscellaneous_paise: number;
          online_aggregator_charges_paise: number;
          salaries_paise: number;
          rent_total_paise: number;
          utilities_paise: number;
          marketing_fees_paise: number;
          management_fees_paise: number;
          logistic_cost_paise: number;
          corporate_expenses_paise: number;
          maintenance_paise: number;
          net_profit_paise: number;
          gst_amount_paise: number;
          invoice_value_paise: number;
          paid_by_franchise_items: Json;
          raw_text: string;
          ingestion_run_id: string;
          deleted_at: string | null;
          deleted_by: string | null;
          purge_scheduled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          period_start: string;
          period_end: string;
          entity_name?: string | null;
          store_name?: string | null;
          gross_sales_paise?: number;
          trade_discount_paise?: number;
          net_sales_paise?: number;
          dine_in_sales_paise?: number;
          swiggy_sales_paise?: number;
          zomato_sales_paise?: number;
          other_online_sales_paise?: number;
          opening_stock_paise?: number;
          purchases_paise?: number;
          closing_stock_paise?: number;
          cogs_paise?: number;
          gross_profit_paise?: number;
          total_expenses_paise?: number;
          miscellaneous_paise?: number;
          online_aggregator_charges_paise?: number;
          salaries_paise?: number;
          rent_total_paise?: number;
          utilities_paise?: number;
          marketing_fees_paise?: number;
          management_fees_paise?: number;
          logistic_cost_paise?: number;
          corporate_expenses_paise?: number;
          maintenance_paise?: number;
          net_profit_paise?: number;
          gst_amount_paise?: number;
          invoice_value_paise?: number;
          paid_by_franchise_items?: Json;
          raw_text: string;
          ingestion_run_id: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          purge_scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          period_start?: string;
          period_end?: string;
          entity_name?: string | null;
          store_name?: string | null;
          gross_sales_paise?: number;
          trade_discount_paise?: number;
          net_sales_paise?: number;
          dine_in_sales_paise?: number;
          swiggy_sales_paise?: number;
          zomato_sales_paise?: number;
          other_online_sales_paise?: number;
          opening_stock_paise?: number;
          purchases_paise?: number;
          closing_stock_paise?: number;
          cogs_paise?: number;
          gross_profit_paise?: number;
          total_expenses_paise?: number;
          miscellaneous_paise?: number;
          online_aggregator_charges_paise?: number;
          salaries_paise?: number;
          rent_total_paise?: number;
          utilities_paise?: number;
          marketing_fees_paise?: number;
          management_fees_paise?: number;
          logistic_cost_paise?: number;
          corporate_expenses_paise?: number;
          maintenance_paise?: number;
          net_profit_paise?: number;
          gst_amount_paise?: number;
          invoice_value_paise?: number;
          paid_by_franchise_items?: Json;
          raw_text?: string;
          ingestion_run_id?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          purge_scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pnl_reports_deleted_by_fkey";
            columns: ["deleted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pnl_reports_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pnl_reports_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      pnl_expense_lines: {
        Row: {
          id: string;
          report_id: string;
          category: string;
          subcategory: string | null;
          label: string;
          amount_paise: number;
          paid_by_franchise: boolean;
          notes: string | null;
          ingestion_run_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          category: string;
          subcategory?: string | null;
          label: string;
          amount_paise?: number;
          paid_by_franchise?: boolean;
          notes?: string | null;
          ingestion_run_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          category?: string;
          subcategory?: string | null;
          label?: string;
          amount_paise?: number;
          paid_by_franchise?: boolean;
          notes?: string | null;
          ingestion_run_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pnl_expense_lines_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pnl_expense_lines_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "pnl_reports";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      active_outlets: {
        Row: {
          id: string;
          name: string;
          brand: string;
          address: string | null;
          phone: string | null;
          petpooja_restaurant_id: string | null;
          status: "active" | "setup" | "closed";
          gst_number: string | null;
          fssai_license: string | null;
          opened_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: never[];
      };
      active_ingestion_runs: {
        Row: {
          id: string;
          outlet_id: string | null;
          uploaded_by: string;
          uploaded_at: string;
          source_type: string;
          detection_method:
            | "filename_pattern"
            | "header_inspection"
            | "content_llm"
            | "user_override";
          detection_confidence: number | null;
          user_confirmed_source: boolean;
          file_name: string;
          file_size_bytes: number;
          file_mime_type: string | null;
          file_storage_path: string;
          file_sha256: string | null;
          status: Database["public"]["Enums"]["ingestion_status"];
          parsing_started_at: string | null;
          parsing_completed_at: string | null;
          committing_started_at: string | null;
          committed_at: string | null;
          rolled_back_at: string | null;
          failed_at: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          purge_scheduled_at: string | null;
          rows_seen: number | null;
          rows_parsed: number | null;
          rows_to_insert: number | null;
          rows_duplicate: number | null;
          rows_errored: number | null;
          preview_payload: Json | null;
          error_details: Json | null;
          committed_by: string | null;
          rolled_back_by: string | null;
          rollback_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: never[];
      };
      active_pnl_reports: {
        Row: Database["public"]["Tables"]["pnl_reports"]["Row"];
        Relationships: Database["public"]["Tables"]["pnl_reports"]["Relationships"];
      };
      active_sales_orders: {
        Row: Database["public"]["Tables"]["sales_orders"]["Row"];
        Relationships: Database["public"]["Tables"]["sales_orders"]["Relationships"];
      };
      active_payment_transactions: {
        Row: Database["public"]["Tables"]["payment_transactions"]["Row"];
        Relationships: Database["public"]["Tables"]["payment_transactions"]["Relationships"];
      };
      active_aggregator_payouts: {
        Row: Database["public"]["Tables"]["aggregator_payouts"]["Row"];
        Relationships: Database["public"]["Tables"]["aggregator_payouts"]["Relationships"];
      };
      active_customer_profiles: {
        Row: {
          id: string;
          name: string | null;
          phone_last_4: string | null;
          first_seen_at: string;
          last_seen_at: string;
          total_orders: number;
          total_spend_paise: number;
          identity_count: number;
          phone_identity_count: number;
          upi_identity_count: number;
          card_identity_count: number;
          has_aggregator_orders: boolean;
          has_dine_in: boolean;
          aggregator_order_count: number;
          dine_in_visit_count: number;
          highest_segment: string;
          primary_identifier: string;
          search_text: string | null;
        };
        Relationships: never[];
      };
      customer_profiles: {
        Row: {
          id: string;
          name: string | null;
          phone_last_4: string | null;
          first_seen_at: string;
          last_seen_at: string;
          total_orders: number;
          total_spend_paise: number;
          identity_count: number;
          phone_identity_count: number;
          upi_identity_count: number;
          card_identity_count: number;
          has_aggregator_orders: boolean;
          has_dine_in: boolean;
          aggregator_order_count: number;
          dine_in_visit_count: number;
          highest_segment: string;
          primary_identifier: string;
          search_text: string | null;
        };
        Relationships: never[];
      };
      customer_segment_overview: {
        Row: {
          segment: string;
          customer_count: number;
          total_spend_paise: number;
          average_order_count: number;
        };
        Relationships: never[];
      };
    };
    Functions: {
      is_partner: {
        Args: { user_id: string };
        Returns: boolean;
      };
      normalize_customer_phone: {
        Args: { raw_phone: string };
        Returns: string;
      };
      hash_customer_phone: {
        Args: { raw_phone: string };
        Returns: string;
      };
      hash_card_fingerprint: {
        Args: {
          raw_card_last_4: string | null;
          raw_card_issuer: string | null;
          raw_card_network: string | null;
        };
        Returns: string;
      };
      customer_segment_label: {
        Args: {
          p_total_orders: number;
          p_first_seen_at: string;
          p_last_seen_at: string;
        };
        Returns: string;
      };
      refresh_customer_aggregates: {
        Args: { customer_ids?: string[] | null };
        Returns: undefined;
      };
      delete_orphan_customers: {
        Args: { customer_ids?: string[] | null };
        Returns: undefined;
      };
      purge_deleted_runs: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      sales_source_row_hash: {
        Args: { parts: string[] };
        Returns: string;
      };
    };
    Enums: {
      role_type: "partner" | "manager";
      outlet_status: "active" | "setup" | "closed";
      employee_role: "manager" | "staff" | "cleaner";
      employment_type: "full_time" | "part_time";
      salary_change_reason: "joining" | "hike" | "demotion" | "correction";
      sales_channel: "dine_in" | "takeaway" | "swiggy" | "zomato" | "other";
      sales_status: "success" | "cancelled" | "refunded" | "partial";
      settlement_status: "settled" | "pending" | "unknown";
      identity_kind: "phone_hash" | "upi_vpa" | "card_fingerprint";
      payment_method:
        | "cash"
        | "card"
        | "upi"
        | "wallet"
        | "online_aggregator"
        | "not_paid"
        | "part_payment"
        | "other";
      ingestion_status:
        | "uploaded"
        | "parsing"
        | "preview_ready"
        | "committing"
        | "committed"
        | "rolled_back"
        | "failed"
        | "purged";
      detection_method: "filename_pattern" | "header_inspection" | "content_llm" | "user_override";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
