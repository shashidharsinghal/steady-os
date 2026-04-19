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
          file_sha256: string;
          status:
            | "uploaded"
            | "parsing"
            | "preview_ready"
            | "committing"
            | "committed"
            | "rolled_back"
            | "failed";
          parsing_started_at: string | null;
          parsing_completed_at: string | null;
          committing_started_at: string | null;
          committed_at: string | null;
          rolled_back_at: string | null;
          failed_at: string | null;
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
          file_sha256: string;
          status?:
            | "uploaded"
            | "parsing"
            | "preview_ready"
            | "committing"
            | "committed"
            | "rolled_back"
            | "failed";
          parsing_started_at?: string | null;
          parsing_completed_at?: string | null;
          committing_started_at?: string | null;
          committed_at?: string | null;
          rolled_back_at?: string | null;
          failed_at?: string | null;
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
          file_sha256?: string;
          status?:
            | "uploaded"
            | "parsing"
            | "preview_ready"
            | "committing"
            | "committed"
            | "rolled_back"
            | "failed";
          parsing_started_at?: string | null;
          parsing_completed_at?: string | null;
          committing_started_at?: string | null;
          committed_at?: string | null;
          rolled_back_at?: string | null;
          failed_at?: string | null;
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
        Relationships: never[];
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
        | "failed";
      detection_method: "filename_pattern" | "header_inspection" | "content_llm" | "user_override";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
