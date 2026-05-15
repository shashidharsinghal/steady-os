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
          opened_on: string | null;
          total_invested_paise: number | null;
          projected_breakeven_date: string | null;
          auto_approve_under_paise: number;
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
          opened_on?: string | null;
          total_invested_paise?: number | null;
          projected_breakeven_date?: string | null;
          auto_approve_under_paise?: number;
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
          opened_on?: string | null;
          total_invested_paise?: number | null;
          projected_breakeven_date?: string | null;
          auto_approve_under_paise?: number;
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
      customer_segment_definitions: {
        Row: {
          id: string;
          outlet_id: string;
          slot: number;
          name: string;
          color_token: string;
          rule_type: string;
          rule_params: Json;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          slot: number;
          name: string;
          color_token: string;
          rule_type: string;
          rule_params?: Json;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          slot?: number;
          name?: string;
          color_token?: string;
          rule_type?: string;
          rule_params?: Json;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_segment_definitions_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          color_token: string;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          name: string;
          color_token: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          color_token?: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_budgets: {
        Row: {
          id: string;
          outlet_id: string;
          category_id: string;
          monthly_budget_paise: number;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          category_id: string;
          monthly_budget_paise: number;
          effective_from: string;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          category_id?: string;
          monthly_budget_paise?: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_budgets_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_budgets_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          outlet_id: string;
          category_id: string;
          subcategory: string | null;
          vendor_name: string | null;
          description: string;
          comment: string | null;
          for_item: string | null;
          period_label: string | null;
          amount_paise: number;
          tax_paise: number;
          total_paise: number;
          status: Database["public"]["Enums"]["expense_status"];
          invoice_date: string | null;
          due_date: string | null;
          paid_date: string | null;
          paid_via: string | null;
          paid_reference: string | null;
          source: Database["public"]["Enums"]["expense_source"];
          source_email_id: string | null;
          source_email_addr: string | null;
          attachment_url: string | null;
          extraction_confidence: number | null;
          is_recurring: boolean;
          recurrence_period: string | null;
          recurring_parent_id: string | null;
          next_due_date: string | null;
          approved_at: string | null;
          approved_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          category_id: string;
          subcategory?: string | null;
          vendor_name?: string | null;
          description: string;
          comment?: string | null;
          for_item?: string | null;
          period_label?: string | null;
          amount_paise: number;
          tax_paise?: number;
          total_paise: number;
          status?: Database["public"]["Enums"]["expense_status"];
          invoice_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          paid_via?: string | null;
          paid_reference?: string | null;
          source?: Database["public"]["Enums"]["expense_source"];
          source_email_id?: string | null;
          source_email_addr?: string | null;
          attachment_url?: string | null;
          extraction_confidence?: number | null;
          is_recurring?: boolean;
          recurrence_period?: string | null;
          recurring_parent_id?: string | null;
          next_due_date?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          category_id?: string;
          subcategory?: string | null;
          vendor_name?: string | null;
          description?: string;
          comment?: string | null;
          for_item?: string | null;
          period_label?: string | null;
          amount_paise?: number;
          tax_paise?: number;
          total_paise?: number;
          status?: Database["public"]["Enums"]["expense_status"];
          invoice_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          paid_via?: string | null;
          paid_reference?: string | null;
          source?: Database["public"]["Enums"]["expense_source"];
          source_email_id?: string | null;
          source_email_addr?: string | null;
          attachment_url?: string | null;
          extraction_confidence?: number | null;
          is_recurring?: boolean;
          recurrence_period?: string | null;
          recurring_parent_id?: string | null;
          next_due_date?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_recurring_parent_id_fkey";
            columns: ["recurring_parent_id"];
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          outlet_id: string | null;
          user_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id?: string | null;
          user_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string | null;
          user_id?: string | null;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
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
      tasks: {
        Row: {
          id: string;
          outlet_id: string;
          title: string;
          details: string | null;
          area:
            | "operations"
            | "food"
            | "accounts"
            | "maintenance"
            | "people"
            | "vendors"
            | "marketing"
            | "compliance"
            | "other";
          criticality: "low" | "medium" | "high" | "critical";
          status: "open" | "in_progress" | "blocked" | "done" | "cancelled";
          assignee_type: "user" | "role";
          assignee_user_id: string | null;
          assignee_role: "store_manager" | null;
          created_by: string;
          completed_by: string | null;
          due_date: string | null;
          completed_at: string | null;
          related_type: string | null;
          related_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          title: string;
          details?: string | null;
          area?:
            | "operations"
            | "food"
            | "accounts"
            | "maintenance"
            | "people"
            | "vendors"
            | "marketing"
            | "compliance"
            | "other";
          criticality?: "low" | "medium" | "high" | "critical";
          status?: "open" | "in_progress" | "blocked" | "done" | "cancelled";
          assignee_type?: "user" | "role";
          assignee_user_id?: string | null;
          assignee_role?: "store_manager" | null;
          created_by: string;
          completed_by?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          related_type?: string | null;
          related_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          title?: string;
          details?: string | null;
          area?:
            | "operations"
            | "food"
            | "accounts"
            | "maintenance"
            | "people"
            | "vendors"
            | "marketing"
            | "compliance"
            | "other";
          criticality?: "low" | "medium" | "high" | "critical";
          status?: "open" | "in_progress" | "blocked" | "done" | "cancelled";
          assignee_type?: "user" | "role";
          assignee_user_id?: string | null;
          assignee_role?: "store_manager" | null;
          created_by?: string;
          completed_by?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          related_type?: string | null;
          related_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_user_id_fkey";
            columns: ["assignee_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_completed_by_fkey";
            columns: ["completed_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          id: string;
          outlet_id: string;
          item_name: string;
          category: string | null;
          variation: string | null;
          selling_price_paise: number;
          cost_to_prepare_paise: number | null;
          current_stock: number | null;
          reorder_level: number | null;
          unit: string;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          item_name: string;
          category?: string | null;
          variation?: string | null;
          selling_price_paise: number;
          cost_to_prepare_paise?: number | null;
          current_stock?: number | null;
          reorder_level?: number | null;
          unit?: string;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          item_name?: string;
          category?: string | null;
          variation?: string | null;
          selling_price_paise?: number;
          cost_to_prepare_paise?: number | null;
          current_stock?: number | null;
          reorder_level?: number | null;
          unit?: string;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      gmail_connections: {
        Row: {
          id: string;
          outlet_id: string;
          connected_by: string;
          gmail_address: string;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          scopes: string[];
          status: "active" | "expired" | "revoked" | "error";
          last_sync_at: string | null;
          last_sync_status: "success" | "partial" | "failed" | "no_emails" | null;
          last_sync_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          connected_by: string;
          gmail_address: string;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          status?: "active" | "expired" | "revoked" | "error";
          last_sync_at?: string | null;
          last_sync_status?: "success" | "partial" | "failed" | "no_emails" | null;
          last_sync_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          connected_by?: string;
          gmail_address?: string;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          status?: "active" | "expired" | "revoked" | "error";
          last_sync_at?: string | null;
          last_sync_status?: "success" | "partial" | "failed" | "no_emails" | null;
          last_sync_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gmail_connections_connected_by_fkey";
            columns: ["connected_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gmail_connections_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      gmail_sync_runs: {
        Row: {
          id: string;
          connection_id: string;
          outlet_id: string;
          triggered_by: "cron_primary" | "cron_retry" | "manual" | "backfill";
          started_at: string;
          completed_at: string | null;
          status: "running" | "success" | "partial" | "failed" | "no_emails";
          emails_found: number;
          emails_processed: number;
          emails_skipped: number;
          ingestion_run_ids: string[];
          processed_message_ids: string[];
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          outlet_id: string;
          triggered_by: "cron_primary" | "cron_retry" | "manual" | "backfill";
          started_at?: string;
          completed_at?: string | null;
          status?: "running" | "success" | "partial" | "failed" | "no_emails";
          emails_found?: number;
          emails_processed?: number;
          emails_skipped?: number;
          ingestion_run_ids?: string[];
          processed_message_ids?: string[];
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          outlet_id?: string;
          triggered_by?: "cron_primary" | "cron_retry" | "manual" | "backfill";
          started_at?: string;
          completed_at?: string | null;
          status?: "running" | "success" | "partial" | "failed" | "no_emails";
          emails_found?: number;
          emails_processed?: number;
          emails_skipped?: number;
          ingestion_run_ids?: string[];
          processed_message_ids?: string[];
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gmail_sync_runs_connection_id_fkey";
            columns: ["connection_id"];
            referencedRelation: "gmail_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gmail_sync_runs_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      gmail_processed_messages: {
        Row: {
          id: string;
          outlet_id: string;
          connection_id: string;
          sync_run_id: string;
          message_id: string;
          source_type: string;
          subject: string;
          sender: string;
          received_at: string | null;
          ingestion_run_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          connection_id: string;
          sync_run_id: string;
          message_id: string;
          source_type: string;
          subject: string;
          sender: string;
          received_at?: string | null;
          ingestion_run_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          connection_id?: string;
          sync_run_id?: string;
          message_id?: string;
          source_type?: string;
          subject?: string;
          sender?: string;
          received_at?: string | null;
          ingestion_run_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gmail_processed_messages_connection_id_fkey";
            columns: ["connection_id"];
            referencedRelation: "gmail_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gmail_processed_messages_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gmail_processed_messages_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gmail_processed_messages_sync_run_id_fkey";
            columns: ["sync_run_id"];
            referencedRelation: "gmail_sync_runs";
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
          trigger_source: "manual_upload" | "gmail_auto" | "gmail_manual" | "gmail_backfill";
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
          archived_at: string | null;
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
          trigger_source?: "manual_upload" | "gmail_auto" | "gmail_manual" | "gmail_backfill";
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
          archived_at?: string | null;
          purge_scheduled_at?: string | null;
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
          trigger_source?: "manual_upload" | "gmail_auto" | "gmail_manual" | "gmail_backfill";
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
          archived_at?: string | null;
          purge_scheduled_at?: string | null;
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
          order_type: string | null;
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
          covers: number | null;
          server_name: string | null;
          table_no: string | null;
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
          order_type?: string | null;
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
          covers?: number | null;
          server_name?: string | null;
          table_no?: string | null;
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
          order_type?: string | null;
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
          covers?: number | null;
          server_name?: string | null;
          table_no?: string | null;
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
      sales_payment_splits: {
        Row: {
          id: string;
          order_id: string;
          outlet_id: string;
          method: string;
          amount_paise: number;
          ingestion_run_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          outlet_id: string;
          method: string;
          amount_paise: number;
          ingestion_run_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          outlet_id?: string;
          method?: string;
          amount_paise?: number;
          ingestion_run_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_payment_splits_ingestion_run_id_fkey";
            columns: ["ingestion_run_id"];
            referencedRelation: "ingestion_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_payment_splits_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_payment_splits_outlet_id_fkey";
            columns: ["outlet_id"];
            referencedRelation: "outlets";
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
          opened_on: string | null;
          total_invested_paise: number | null;
          projected_breakeven_date: string | null;
          auto_approve_under_paise: number;
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
          trigger_source: "manual_upload" | "gmail_auto" | "gmail_manual" | "gmail_backfill";
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
          archived_at: string | null;
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
      archived_ingestion_runs: {
        Row: Database["public"]["Tables"]["ingestion_runs"]["Row"];
        Relationships: Database["public"]["Tables"]["ingestion_runs"]["Relationships"];
      };
      active_pnl_reports: {
        Row: Database["public"]["Tables"]["pnl_reports"]["Row"];
        Relationships: Database["public"]["Tables"]["pnl_reports"]["Relationships"];
      };
      active_sales_orders: {
        Row: Database["public"]["Tables"]["sales_orders"]["Row"];
        Relationships: Database["public"]["Tables"]["sales_orders"]["Relationships"];
      };
      active_sales_line_items: {
        Row: Database["public"]["Tables"]["sales_line_items"]["Row"];
        Relationships: Database["public"]["Tables"]["sales_line_items"]["Relationships"];
      };
      active_sales_payment_splits: {
        Row: Database["public"]["Tables"]["sales_payment_splits"]["Row"];
        Relationships: Database["public"]["Tables"]["sales_payment_splits"]["Relationships"];
      };
      active_inventory_items: {
        Row: Database["public"]["Tables"]["inventory_items"]["Row"] & {
          profit_margin_pct: number | null;
        };
        Relationships: Database["public"]["Tables"]["inventory_items"]["Relationships"];
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
      outlet_monthly_profit: {
        Row: {
          outlet_id: string;
          month: string;
          revenue_paise: number;
          cogs_paise: number;
          expenses_paise: number;
          net_profit_paise: number;
        };
        Relationships: never[];
      };
      expense_budget_summary: {
        Row: {
          outlet_id: string;
          category_id: string;
          category_name: string;
          color_token: string;
          display_order: number;
          budget_id: string | null;
          monthly_budget_paise: number | null;
          spent_paise: number;
          pct_used: number | null;
        };
        Relationships: never[];
      };
      active_tasks: {
        Row: Database["public"]["Tables"]["tasks"]["Row"];
        Relationships: Database["public"]["Tables"]["tasks"]["Relationships"];
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
      dashboard_item_performance: {
        Args: {
          p_outlet_id: string;
          p_start: string;
          p_end: string;
        };
        Returns: {
          kind: string;
          category: string | null;
          item_name: string | null;
          qty: number;
          revenue_paise: number;
        }[];
      };
      dashboard_payment_method_breakdown: {
        Args: {
          p_outlet_id: string;
          p_start: string;
          p_end: string;
        };
        Returns: {
          method: string;
          total_paise: number;
          order_count: number;
        }[];
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
      expense_status:
        | "auto_scanned"
        | "needs_review"
        | "approved"
        | "paid"
        | "overdue"
        | "rejected"
        | "cancelled";
      expense_source: "manual" | "gmail_scan" | "petpooja_pnl" | "recurring_auto";
      task_status: "open" | "in_progress" | "blocked" | "done" | "cancelled";
      task_criticality: "low" | "medium" | "high" | "critical";
      task_area:
        | "operations"
        | "food"
        | "accounts"
        | "maintenance"
        | "people"
        | "vendors"
        | "marketing"
        | "compliance"
        | "other";
      task_assignee_type: "user" | "role";
      task_role_assignee: "store_manager";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
