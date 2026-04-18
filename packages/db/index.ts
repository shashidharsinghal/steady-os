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
    };
    Enums: {
      role_type: "partner" | "manager";
      outlet_status: "active" | "setup" | "closed";
      employee_role: "manager" | "staff" | "cleaner";
      employment_type: "full_time" | "part_time";
      salary_change_reason: "joining" | "hike" | "demotion" | "correction";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
