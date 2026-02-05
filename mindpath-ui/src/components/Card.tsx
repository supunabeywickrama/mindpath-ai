import type { ReactNode } from "react";

export default function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 shadow-sm">
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            {title && <div className="text-base font-semibold">{title}</div>}
            {subtitle && <div className="text-sm text-zinc-400 mt-0.5">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
