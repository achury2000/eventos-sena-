// Fondo decorativo global: aurora que deriva lentamente, rejilla de puntos y
// partículas que ascienden. Es solo CSS (sin JavaScript), queda detrás de todo
// el contenido y no recibe clics. Se oculta al imprimir y si la persona pidió
// reducir el movimiento.
const PARTICULAS = [
  { x: "6%", s: 5, d: 19, r: 0, dx: 30 },
  { x: "14%", s: 3, d: 24, r: 6, dx: -20 },
  { x: "23%", s: 6, d: 21, r: 11, dx: 40 },
  { x: "33%", s: 4, d: 27, r: 3, dx: -30 },
  { x: "42%", s: 3, d: 18, r: 14, dx: 20 },
  { x: "51%", s: 5, d: 25, r: 8, dx: -40 },
  { x: "60%", s: 4, d: 22, r: 1, dx: 30 },
  { x: "69%", s: 6, d: 28, r: 16, dx: -25 },
  { x: "77%", s: 3, d: 20, r: 5, dx: 35 },
  { x: "85%", s: 5, d: 23, r: 12, dx: -35 },
  { x: "92%", s: 4, d: 26, r: 9, dx: 25 },
  { x: "97%", s: 3, d: 17, r: 2, dx: -15 },
];

export function FondoAnimado() {
  return (
    <div aria-hidden="true" className="fondo-sena print:hidden">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="rejilla" />
      {PARTICULAS.map((p, i) => (
        <span
          key={i}
          className="particula"
          style={
            {
              "--x": p.x,
              "--s": `${p.s}px`,
              "--d": `${p.d}s`,
              "--r": `-${p.r}s`,
              "--dx": `${p.dx}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
