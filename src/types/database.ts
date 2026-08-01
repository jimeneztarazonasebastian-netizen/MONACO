/**
 * ARCHIVO TEMPORAL.
 *
 * Lo definitivo se genera contra la base real con:
 *   npx supabase gen types typescript --local > src/types/database.ts
 *
 * Mientras tanto solo está tipada `profiles`, que es lo único que
 * consulta el módulo de autenticación. Si al escribir una consulta a
 * otra tabla TypeScript se queja, no es un error del código: es la
 * señal de que ya toca generar los tipos de verdad.
 */

export type RolUsuario = "admin" | "cajero";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: RolUsuario;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: RolUsuario;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: RolUsuario;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: RolUsuario;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Perfil = Database["public"]["Tables"]["profiles"]["Row"];
