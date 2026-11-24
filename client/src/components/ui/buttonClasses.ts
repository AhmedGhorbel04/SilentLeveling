export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-arcane-600 text-white shadow-glow-sm hover:bg-arcane-500 hover:shadow-glow disabled:bg-arcane-600/50',
  secondary:
    'border border-abyss-border bg-abyss-light text-slate-200 hover:border-arcane-500/60 hover:text-white',
  ghost: 'text-slate-300 hover:bg-abyss-light hover:text-white',
};

// Shared by <Button> and by <Link> elements that should look like buttons
export function buttonClasses(variant: ButtonVariant = 'primary', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${variantClasses[variant]} ${extra}`;
}
