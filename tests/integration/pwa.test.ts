import { describe, expect, it } from "vitest";
import {
  PWA_MAX_DOCUMENTOS,
  PWA_TTL_DOCUMENTOS_MS,
  PWA_VERSION,
} from "@/lib/pwa/constantes";
import {
  entradasSobrantes,
  estaVencido,
  nombreCacheAssets,
  nombreCacheDocumentos,
  normalizarUrlRsc,
} from "@/lib/pwa/documentos";
import {
  debeMostrarBotonInstalacion,
  esAndroid,
  esNavegadorChromium,
  esSafariIOS,
} from "@/lib/pwa/instalacion";

describe("pwa · documentos en caché", () => {
  const ahora = Date.parse("2026-10-26T12:00:00.000Z");

  it("considera vencida una copia de más de 24 horas", () => {
    const justoAntes = new Date(ahora - PWA_TTL_DOCUMENTOS_MS + 1000);
    const justoDespues = new Date(ahora - PWA_TTL_DOCUMENTOS_MS - 1000);

    expect(estaVencido(justoAntes.toISOString(), ahora)).toBe(false);
    expect(estaVencido(justoDespues.toISOString(), ahora)).toBe(true);
  });

  it("descarta fechas ausentes, vacías o inválidas", () => {
    expect(estaVencido(null, ahora)).toBe(true);
    expect(estaVencido(undefined, ahora)).toBe(true);
    expect(estaVencido("", ahora)).toBe(true);
    expect(estaVencido("no-es-una-fecha", ahora)).toBe(true);
  });

  it("normaliza la URL RSC sin perder otros parámetros", () => {
    const normalizada = normalizarUrlRsc(
      "https://eventos.test/inscripcion/abc?_rsc=hash123&eventoId=7"
    );

    expect(normalizada).toBe(
      "https://eventos.test/inscripcion/abc?eventoId=7&__pwa_rsc=1"
    );
    expect(normalizada).not.toContain("_rsc=hash123");
  });

  it("separa el payload RSC del HTML de la misma ruta", () => {
    const html = "https://eventos.test/admin";
    const rsc = normalizarUrlRsc("https://eventos.test/admin?_rsc=abc");

    expect(rsc).not.toBe(html);
    expect(rsc).toContain("__pwa_rsc=1");
  });

  it("usa nombres de caché versionados", () => {
    expect(nombreCacheDocumentos()).toBe(`pwa-docs-${PWA_VERSION}`);
    expect(nombreCacheAssets()).toBe(`pwa-assets-${PWA_VERSION}`);
    expect(nombreCacheDocumentos("pwa-2")).toBe("pwa-docs-pwa-2");
    expect(nombreCacheAssets("pwa-2")).toBe("pwa-assets-pwa-2");
  });

  it("calcula cuántas entradas sobran del límite", () => {
    expect(entradasSobrantes(PWA_MAX_DOCUMENTOS - 1)).toBe(0);
    expect(entradasSobrantes(PWA_MAX_DOCUMENTOS)).toBe(0);
    expect(entradasSobrantes(PWA_MAX_DOCUMENTOS + 1)).toBe(1);
    expect(entradasSobrantes(PWA_MAX_DOCUMENTOS + 5)).toBe(5);
  });
});

describe("pwa · botón de instalación", () => {
  const base = {
    standalone: false,
    tienePrompt: true,
    esIOS: false,
    navegadorConInstalacion: true,
  };

  it("se muestra con prompt nativo", () => {
    expect(debeMostrarBotonInstalacion(base)).toBe(true);
  });

  it("se oculta cuando la app ya está instalada", () => {
    expect(
      debeMostrarBotonInstalacion({ ...base, standalone: true })
    ).toBe(false);
  });

  it("en iOS muestra instrucciones aunque no exista prompt nativo", () => {
    expect(
      debeMostrarBotonInstalacion({
        ...base,
        tienePrompt: false,
        esIOS: true,
      })
    ).toBe(true);
  });

  it("en Chromium sin prompt muestra instrucciones manuales", () => {
    expect(
      debeMostrarBotonInstalacion({
        ...base,
        tienePrompt: false,
        esIOS: false,
        navegadorConInstalacion: true,
      })
    ).toBe(true);
  });

  it("sin prompt, sin iOS y sin navegador compatible no muestra nada", () => {
    expect(
      debeMostrarBotonInstalacion({
        ...base,
        tienePrompt: false,
        esIOS: false,
        navegadorConInstalacion: false,
      })
    ).toBe(false);
  });

  it("sigue visible tras consumir el prompt si el navegador permite instalar", () => {
    expect(
      debeMostrarBotonInstalacion({
        ...base,
        tienePrompt: false,
        navegadorConInstalacion: true,
      })
    ).toBe(true);
  });
});

describe("pwa · detección de iOS y navegadores", () => {
  it("detecta iPhone, iPad clásico e iPadOS que se presenta como Mac", () => {
    expect(esSafariIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(true);
    expect(esSafariIOS("Mozilla/5.0 (iPad; CPU OS 12_0)")).toBe(true);
    expect(esSafariIOS("Mozilla/5.0 (Macintosh)", 5, "MacIntel")).toBe(true);
    expect(esSafariIOS("Mozilla/5.0 (Macintosh)", 0, "MacIntel")).toBe(false);
    expect(esSafariIOS("Mozilla/5.0 (Windows NT 10.0)", 0, "Win32")).toBe(
      false
    );
  });

  it("detecta Chromium instalable y excluye navegadores sin instalación", () => {
    const chromeEscritorio =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
    const edgeEscritorio =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0";
    const chromeAndroid =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36";
    const samsungAndroid =
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) SamsungBrowser/27.0 Chrome/152.0.0.0 " +
      "Mobile Safari/537.36";
    const firefox =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) " +
      "Gecko/20100101 Firefox/152.0";
    const safariEscritorio =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    const electron =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Electron/40.0.0";
    const webviewAndroid =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Version/4.0 Chrome/152.0.0.0 Mobile Safari/537.36";

    expect(esNavegadorChromium(chromeEscritorio)).toBe(true);
    expect(esNavegadorChromium(edgeEscritorio)).toBe(true);
    expect(esNavegadorChromium(chromeAndroid)).toBe(true);
    expect(esNavegadorChromium(samsungAndroid)).toBe(true);
    expect(esNavegadorChromium(firefox)).toBe(false);
    expect(esNavegadorChromium(safariEscritorio)).toBe(false);
    expect(esNavegadorChromium(electron)).toBe(false);
    expect(esNavegadorChromium(webviewAndroid)).toBe(false);
  });

  it("detecta Android para elegir las instrucciones del menú", () => {
    expect(
      esAndroid(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36"
      )
    ).toBe(true);
    expect(esAndroid("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });
});
