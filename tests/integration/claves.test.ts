import { beforeEach, describe, expect, it, vi } from "vitest";
import { debeCambiarClave } from "@/lib/claves";

// Test unitario de la consulta de marca (tarea 3.1): el helper solo hace un
// findUnique con select mínimo, así que se mockea el prisma en vez de gastar
// la BD de test.
const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { usuario: { findUnique } } }));

beforeEach(() => {
  findUnique.mockReset();
});

describe("debeCambiarClave (consulta de marca)", () => {
  it("devuelve true cuando la marca está activa", async () => {
    findUnique.mockResolvedValueOnce({ debeCambiarClave: true });
    await expect(debeCambiarClave("u-1")).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "u-1" },
      select: { debeCambiarClave: true },
    });
  });

  it("devuelve false cuando la marca está inactiva", async () => {
    findUnique.mockResolvedValueOnce({ debeCambiarClave: false });
    await expect(debeCambiarClave("u-2")).resolves.toBe(false);
  });

  it("devuelve false cuando la cuenta no existe (sesión huérfana)", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(debeCambiarClave("u-inexistente")).resolves.toBe(false);
  });
});
