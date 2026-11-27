import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarCheck,
  ChartColumn,
  FileSignature,
  QrCode,
} from "lucide-react";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const BENEFICIOS = [
  {
    icono: FileSignature,
    titulo: "Inscripción con firma digital",
    detalle: "Sin planillas en papel: una sola firma cubre a todo el grupo.",
  },
  {
    icono: QrCode,
    titulo: "Checkpoints con código QR",
    detalle: "Cada persona registra su asistencia con solo su documento.",
  },
  {
    icono: ChartColumn,
    titulo: "Reportes en tiempo real",
    detalle: "Esperados vs. registrados, exportables a Excel y PDF.",
  },
];

export default function LoginPage() {
  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de bienvenida: solo en pantallas anchas; en móvil el acceso
          queda a la vista de inmediato. */}
      <section
        aria-hidden="true"
        className="login-hero hidden flex-col justify-between p-10 lg:flex xl:p-14"
      >
        <span className="anillo a1" />
        <span className="anillo a2" />
        <span className="anillo a3" />

        <div className="cascada flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest backdrop-blur">
            <CalendarCheck className="size-3.5" />
            Bienestar al Aprendiz
          </div>
          <p className="max-w-lg text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Eventos que se viven,{" "}
            <span className="bg-linear-to-r from-[#d8ff8a] via-[#50e5f9] to-[#fdc300] bg-clip-text text-transparent">
              asistencia que se cuenta.
            </span>
          </p>
          <p className="max-w-md text-base leading-relaxed text-white/85">
            La plataforma del SENA para inscribir, controlar y reportar la
            asistencia a paseos y encuentros de hasta 1000 personas.
          </p>
        </div>

        <ul className="cascada mt-10 flex max-w-lg flex-col gap-3">
          {BENEFICIOS.map(({ icono: Icono, titulo, detalle }, i) => (
            <li
              key={titulo}
              className="chip-flota flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md"
              style={{ animationDelay: `${i * -1.6}s` }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-[#0b3d00] shadow-lg">
                <Icono className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-sm text-white/80">{detalle}</span>
              </span>
            </li>
          ))}
        </ul>

        <Image
          src="/logo-sena.png"
          alt=""
          width={225}
          height={225}
          unoptimized
          className="mt-10 size-20 rounded-2xl shadow-2xl ring-1 ring-white/30"
        />
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="tarjeta-acceso w-full max-w-sm rounded-2xl border bg-card p-7 shadow-xl">
          <div className="mb-6 flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="texto-degradado">Bienvenido</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión con tu cuenta de Bienestar al Aprendiz.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
