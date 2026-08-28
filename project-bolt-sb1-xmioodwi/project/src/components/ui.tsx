import React from "react";

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-canvas-line my-1" />;
  return (
    <div className="flex items-center gap-2 my-1">
      <span className="text-meta uppercase tracking-wider text-canvas-faint font-semibold">{label}</span>
      <div className="h-px bg-canvas-line flex-1" />
    </div>
  );
}

export function Field({
  label,
  children,
  inline = true,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="flex items-center gap-2 py-[5px]">
        <label className="text-ctrl text-canvas-sub w-20 shrink-0">{label}</label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }
  return (
    <div className="py-[5px]">
      <label className="text-ctrl text-canvas-sub block mb-1">{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-canvas-paper border border-canvas-line rounded-md px-2 py-[5px] text-ctrl text-canvas-ink focus-ring placeholder:text-canvas-faint hover:border-canvas-faint/60 transition-colors-base ${
        props.className ?? ""
      }`}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  suffix,
  min = 0,
  max = 9999,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center bg-canvas-paper border border-canvas-line rounded-md hover:border-canvas-faint/60 transition-colors-base focus-within:border-canvas-accent/70">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent px-2 py-[5px] text-ctrl text-canvas-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-meta text-canvas-faint pr-2 select-none">{suffix}</span>}
    </div>
  );
}

export function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-canvas-paper border border-canvas-line rounded-md pl-2 pr-7 py-[5px] text-ctrl text-canvas-ink hover:border-canvas-faint/60 focus-ring transition-colors-base cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-canvas-faint"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { label: React.ReactNode; value: T; tip?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center bg-canvas-line/60 rounded-md p-0.5 gap-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            data-tip={o.tip}
            onClick={() => onChange(o.value)}
            className={`tip ${size === "sm" ? "px-2 py-1" : "px-2.5 py-[5px]"} rounded text-ctrl font-medium transition-all-fast focus-ring ${
              active
                ? "bg-canvas-paper text-canvas-ink shadow-sm"
                : "text-canvas-sub hover:text-canvas-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ColorSwatch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-7 h-7 rounded-md border border-canvas-line overflow-hidden shrink-0">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
        <div className="w-full h-full" style={{ background: value }} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-canvas-paper border border-canvas-line rounded-md px-2 py-[5px] text-ctrl text-canvas-ink focus-ring hover:border-canvas-faint/60 transition-colors-base font-mono"
      />
      {label && <span className="text-meta text-canvas-faint">{label}</span>}
    </div>
  );
}

export function PanelButton({
  children,
  onClick,
  variant = "ghost",
  active = false,
  tip,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "outline";
  active?: boolean;
  tip?: string;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md text-ctrl font-medium transition-all-fast focus-ring";
  const variants = {
    ghost: active
      ? "bg-canvas-accentSoft text-canvas-accent"
      : "text-canvas-sub hover:bg-canvas-line2 hover:text-canvas-ink",
    solid: "bg-canvas-ink text-white hover:bg-canvas-ink/90",
    outline: active
      ? "border border-canvas-accent text-canvas-accent bg-canvas-accentSoft"
      : "border border-canvas-line text-canvas-ink hover:bg-canvas-line2",
  };
  return (
    <button
      data-tip={tip}
      onClick={onClick}
      className={`tip ${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  active = false,
  tip,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  tip?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      data-tip={tip}
      onClick={onClick}
      disabled={disabled}
      className={`tip inline-flex items-center justify-center w-7 h-7 rounded-md transition-all-fast focus-ring ${
        active
          ? "bg-canvas-accentSoft text-canvas-accent"
          : "text-canvas-sub hover:bg-canvas-line2 hover:text-canvas-ink"
      } disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 h-[18px] rounded border border-canvas-line bg-canvas-surface text-meta text-canvas-faint font-mono">
      {children}
    </kbd>
  );
}
