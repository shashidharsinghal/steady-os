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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
    };
    Views: Record<string, never>;
    Functions: {
      is_partner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      role_type: "partner" | "manager";
      outlet_status: "active" | "setup" | "closed";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
