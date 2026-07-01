export function moonPhasePath(phase: number, r: number, hemisphere: 'N' | 'S' = 'N') {
  const isWaxing = phase <= 0.5;
  const relPhase = isWaxing ? phase * 2 : (phase - 0.5) * 2;
  const terminatorRx = Math.abs(relPhase - 0.5) * 2 * r;
  const terminatorSweep = relPhase < 0.5 ? 0 : 1;
  const brightSide = isWaxing ? 1 : 0;

  let b = brightSide;
  let s = terminatorSweep;
  // Invertir visualmente para el hemisferio sur
  if (hemisphere === 'S') {
    b = b === 1 ? 0 : 1;
    s = s === 1 ? 0 : 1;
  }

  return `
    M 0 ${-r}
    A ${r} ${r} 0 0 ${b} 0 ${r}
    A ${terminatorRx} ${r} 0 0 ${s} 0 ${-r}
    Z
  `;
}
