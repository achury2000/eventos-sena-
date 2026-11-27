"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MENSAJE_SIN_CONEXION, estaSinConexion } from "@/lib/pwa/conexion";
import { Firma } from "./firma";

type EventoInfo = {
  id: string;
  nombre: string;
  lugar: string;
  cupoMaximo: number;
  cuposOcupados: number;
  // Política de acompañantes configurada por el Administrador para este evento.
  // `0` significa inscripción individual: la sección de acompañantes no se
  // muestra. Este valor NO reemplaza la guarda estructural del esquema
  // (MAX_ACOMPANANTES_TECNICO), que vive en el servidor; acá solo gobierna lo
  // que la persona puede agregar. Ver design.md, decisiones D2 y D10.
  maxAcompanantes: number;
};

type Persona = { nombreCompleto: string; documento: string; centroFormacion: string };

const personaVacia: Persona = { nombreCompleto: "", documento: "", centroFormacion: "" };

export function FormInscripcion({ evento }: { evento: EventoInfo }) {
  const [titular, setTitular] = useState<Persona>(personaVacia);
  const [acompanantes, setAcompanantes] = useState<Persona[]>([]);
  const [correo, setCorreo] = useState("");
  const [firma, setFirma] = useState<string | null>(null);
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [mensajeGeneral, setMensajeGeneral] = useState<string | null>(null);

  const maxAcompanantes = evento.maxAcompanantes;

  function setCampoPersona(
    setea: Dispatch<SetStateAction<Persona>>,
    campo: keyof Persona,
    valor: string
  ) {
    setea((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarTitular(campo: keyof Persona, valor: string) {
    setCampoPersona(setTitular, campo, valor);
  }

  function actualizarAcompanante(indice: number, campo: keyof Persona, valor: string) {
    setAcompanantes((prev) =>
      prev.map((a, i) => (i === indice ? { ...a, [campo]: valor } : a))
    );
  }

  function agregarAcompanante() {
    if (acompanantes.length < maxAcompanantes) {
      setAcompanantes((prev) => [...prev, personaVacia]);
    }
  }

  function quitarAcompanante(indice: number) {
    setAcompanantes((prev) => prev.filter((_, i) => i !== indice));
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrores([]);
    setMensajeGeneral(null);
    setEnviando(true);

    const body = {
      eventoId: evento.id,
      titular: {
        ...titular,
        centroFormacion: titular.centroFormacion || undefined,
      },
      acompanantes: acompanantes.map((a) => ({
        ...a,
        centroFormacion: a.centroFormacion || undefined,
      })),
      correo: correo.trim() || undefined,
      firmaBase64: firma ?? undefined,
      aceptoTratamientoDatos: true,
    };

    try {
      const res = await fetch("/api/inscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 201) {
        setExito(true);
        return;
      }

      if (data?.errors) {
        setErrores([...new Set(Object.values(data.errors) as string[])]);
      } else {
        setMensajeGeneral(data?.error ?? "No se pudo completar la inscripción.");
      }
    } catch {
      setMensajeGeneral(
        estaSinConexion()
          ? MENSAJE_SIN_CONEXION
          : "Error de conexión. Inténtalo de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="rounded-2xl border bg-card p-8 shadow-xl">
        <h2 className="texto-degradado text-2xl font-bold">¡Inscripción completada!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibimos tu inscripción a{" "}
          <span className="font-medium text-foreground">{evento.nombre}</span> con{" "}
          {acompanantes.length === 0
            ? "tu registro como titular"
            : `tu registro como titular y ${acompanantes.length} acompañante(s)`}.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Conserva este aviso. Si necesitas modificar o cancelar la inscripción,
          comunícate con el personal de Bienestar al Aprendiz.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-xl sm:p-8"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{evento.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          {evento.lugar} · Cupos disponibles:{" "}
          {Math.max(evento.cupoMaximo - evento.cuposOcupados, 0)} de {evento.cupoMaximo}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Datos del titular
        </h3>
        <CampoAsistente
          persona={titular}
          onChange={actualizarTitular}
          prefijo="titular"
          conCorreo
          correo={correo}
          onCorreo={setCorreo}
        />
      </section>

      {/* Con límite 0 la sección se OCULTA, no se muestra deshabilitada
          (design.md, D9): un evento de inscripción individual no tiene nada que
          ofrecer aquí, y un control deshabilitado invita a la duda en vez de
          resolverla. El servidor igual rechaza un acompañante en este evento,
          así que ocultarlo no es la única barrera. */}
      {maxAcompanantes > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Acompañantes ({acompanantes.length}/{maxAcompanantes})
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarAcompanante}
              disabled={acompanantes.length >= maxAcompanantes}
            >
              Agregar acompañante
            </Button>
          </div>
          {acompanantes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Puedes agregar hasta {maxAcompanantes}{" "}
              {maxAcompanantes === 1 ? "acompañante" : "acompañantes"}.
            </p>
          ) : (
            acompanantes.map((a, i) => (
              <div key={i} className="rounded-lg border p-4">
                {/* El centro de formación es del titular: los acompañantes dan
                    solo nombre y documento (CONTEXT.md §3 paso 4;
                    `Asistente.centroFormacion` es opcional y lo declara
                    únicamente el titular). El servidor lo guarda null para los
                    acompañantes. */}
                <CampoAsistente
                  persona={a}
                  onChange={(campo, valor) => actualizarAcompanante(i, campo, valor)}
                  prefijo={`acompanante-${i}`}
                  conCentro={false}
                />
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => quitarAcompanante(i)}
                  >
                    Quitar acompañante
                  </Button>
                </div>
              </div>
            ))
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este evento es de inscripción individual: solo se registra al titular,
          sin acompañantes.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <Label>Firma digital (del titular)</Label>
        <Firma onCambio={setFirma} />
        <p className="text-xs text-muted-foreground">
          Al firmar autorizas la participación de todo tu grupo (titular y
          acompañantes) y aceptas el tratamiento de datos personales y
          biométricos de acuerdo con la Ley 1581.
        </p>
      </section>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={acepto}
          onChange={(e) => setAcepto(e.target.checked)}
        />
        <span>
          Acepto el tratamiento de datos personales y biométricos (firma) de todo
          mi grupo, incluidos los acompañantes.
        </span>
      </label>

      {mensajeGeneral ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {mensajeGeneral}
        </p>
      ) : null}
      {errores.length > 0 ? (
        <ul
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <Button
        type="submit"
        disabled={enviando || !firma || !acepto}
        className="w-full"
      >
        {enviando ? "Enviando..." : "Inscribirme"}
      </Button>
    </form>
  );
}

function CampoAsistente({
  persona,
  onChange,
  prefijo,
  conCentro = true,
  conCorreo = false,
  correo,
  onCorreo,
}: {
  persona: Persona;
  onChange: (campo: keyof Persona, valor: string) => void;
  prefijo: string;
  conCentro?: boolean;
  conCorreo?: boolean;
  correo?: string;
  onCorreo?: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefijo}-nombre`}>Nombre completo</Label>
        <Input
          id={`${prefijo}-nombre`}
          value={persona.nombreCompleto}
          onChange={(e) => onChange("nombreCompleto", e.target.value)}
          autoComplete="name"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefijo}-documento`}>Documento</Label>
        <Input
          id={`${prefijo}-documento`}
          value={persona.documento}
          onChange={(e) => onChange("documento", e.target.value)}
          inputMode="numeric"
          pattern="\d{6,12}"
          autoComplete="off"
          required
        />
      </div>
      {conCentro ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefijo}-centro`}>Centro de formación</Label>
          <Input
            id={`${prefijo}-centro`}
            value={persona.centroFormacion}
            onChange={(e) => onChange("centroFormacion", e.target.value)}
            placeholder="Centro de formación"
            maxLength={200}
          />
        </div>
      ) : null}
      {conCorreo ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefijo}-correo`}>Correo (opcional)</Label>
          <Input
            id={`${prefijo}-correo`}
            type="email"
            value={correo}
            onChange={(e) => onCorreo?.(e.target.value)}
            autoComplete="email"
            placeholder="correo@ejemplo.com"
          />
        </div>
      ) : null}
    </div>
  );
}