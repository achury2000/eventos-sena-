import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
        });
        if (!usuario) return null;

        const valido = await compare(
          credentials.password as string,
          usuario.passwordHash
        );
        if (!valido) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombreCompleto,
          nombreCompleto: usuario.nombreCompleto,
          rol: usuario.rol,
          tipoAfiliacion: usuario.tipoAfiliacion,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.nombreCompleto = user.nombreCompleto;
        token.rol = user.rol;
        token.tipoAfiliacion = user.tipoAfiliacion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.nombreCompleto = token.nombreCompleto;
        session.user.rol = token.rol;
        session.user.tipoAfiliacion = token.tipoAfiliacion;
      }
      return session;
    },
  },
});