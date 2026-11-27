// Las plantillas se vuelven a montar en cada navegación, así cada página entra
// con la misma transición suave (ver `.pagina-anim` en globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pagina-anim">{children}</div>;
}
