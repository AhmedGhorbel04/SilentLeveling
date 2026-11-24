// One stat in a <dl>: name, value and a bar. The bar is a second <dd> so the list
// stays valid HTML (a <div> inside a <dl> may only hold <dt> and <dd> elements).
export function StatBar({
  name,
  value,
  max,
  small = false,
}: {
  name: string;
  value: number;
  max: number;
  small?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1fr_auto] gap-y-1 ${small ? 'text-xs' : 'text-sm'}`}>
      <dt className="text-slate-400">{name}</dt>
      <dd
        className={small ? 'font-semibold text-slate-200' : 'font-display font-semibold text-white'}
      >
        {value}
      </dd>
      <dd
        className={`col-span-2 rounded-full bg-void ${small ? 'h-1' : 'h-1.5'}`}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-arcane-500/80 transition-[width] duration-700"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </dd>
    </div>
  );
}
