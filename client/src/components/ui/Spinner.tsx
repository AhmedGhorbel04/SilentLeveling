export function Spinner({ className = 'size-6' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-e-transparent ${className}`}
    />
  );
}

export function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-arcane-400" role="status">
      <Spinner className="size-8" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
