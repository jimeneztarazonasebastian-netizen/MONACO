import type { NextConfig } from "next";

// Las fotos viven en Supabase Storage. Next solo optimiza imágenes de
// dominios declarados aquí; sin esto, cualquier <Image> remoto falla.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hostSupabase = supabase ? new URL(supabase).hostname : undefined;

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en C:\Users\Isabel y Turbopack lo
  // toma como raíz del espacio de trabajo, con lo que busca los
  // archivos donde no están. Aquí se le dice cuál es la raíz de verdad.
  turbopack: { root: __dirname },

  images: {
    remotePatterns: hostSupabase
      ? [
          {
            protocol: "https",
            hostname: hostSupabase,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
