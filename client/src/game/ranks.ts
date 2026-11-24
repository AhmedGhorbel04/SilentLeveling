const ROMAN = ['', 'I', 'II', 'III', 'IV'];

// 'C2' → 'C II', 'SS' → 'SS' (same labels as the backend rank table)
export function rankLabel(code: string): string {
  if (code === 'SS') return 'SS';
  return `${code[0]} ${ROMAN[Number(code[1])] ?? ''}`.trim();
}

// Colour of a rank badge, by rank letter
export function rankColor(code: string): string {
  const letter = code[0];
  if (code === 'SS') return 'from-rose-500 to-amber-400';
  if (letter === 'S') return 'from-amber-400 to-orange-500';
  if (letter === 'A') return 'from-fuchsia-500 to-rose-500';
  if (letter === 'B') return 'from-arcane-500 to-fuchsia-500';
  if (letter === 'C') return 'from-azure-500 to-arcane-500';
  if (letter === 'D') return 'from-cyan-500 to-azure-500';
  return 'from-slate-400 to-slate-500';
}
