import type { RolUsuario, TipoAfiliacion } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nombreCompleto: string;
      rol: RolUsuario;
      tipoAfiliacion: TipoAfiliacion;
    } & DefaultSession["user"];
  }

  interface User {
    nombreCompleto: string;
    rol: RolUsuario;
    tipoAfiliacion: TipoAfiliacion;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    nombreCompleto: string;
    rol: RolUsuario;
    tipoAfiliacion: TipoAfiliacion;
  }
}