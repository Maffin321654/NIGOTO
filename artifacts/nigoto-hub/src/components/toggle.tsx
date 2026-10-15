import { cn } from "@/lib/utils";

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-11 items-center gap-3 text-left"
    >
      <span className={cn("relative h-7 w-12 rounded-full transition", on ? "bg-accent" : "bg-line")}>
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-paper-3 transition", on ? "left-5.5 translate-x-0 left-[22px]" : "left-0.5")} />
      </span>
      <span className="text-sm text-ink">{label}</span>
    </button>
  );
}
