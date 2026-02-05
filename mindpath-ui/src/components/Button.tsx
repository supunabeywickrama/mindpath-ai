import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={clsx(
        "px-4 py-2 rounded-xl text-sm font-medium transition border",
        variant === "primary" &&
          "bg-indigo-500/90 hover:bg-indigo-500 text-white border-indigo-400/30",
        variant === "secondary" &&
          "bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-white/10",
        variant === "ghost" &&
          "bg-transparent hover:bg-white/5 text-zinc-100 border-white/10",
        className
      )}
      {...props}
    />
  );
}
