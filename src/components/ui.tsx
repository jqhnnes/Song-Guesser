import type { ButtonHTMLAttributes, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

const AVATARS = ["#ff4d3a", "#ffb020", "#3ee0a2", "#7aa2ff", "#d48bff", "#ff8f6b"];

export function avatarColor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash + char.charCodeAt(0)) % AVATARS.length;
  return AVATARS[hash];
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-cream/80">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-coral text-[11px] text-white">
        ♪
      </span>
      TIMELINE
    </span>
  );
}

export function Screen({
  header,
  children,
  footer,
}: {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header ? <div className="safe-top shrink-0 px-5 pb-2">{header}</div> : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
        {children}
      </div>
      {footer ? (
        <div className="safe-bottom shrink-0 border-t border-white/6 bg-ink/85 px-5 pt-3 backdrop-blur-xl">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Button({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const classes = cn(
    "flex h-14 w-full items-center justify-center rounded-2xl px-5 text-[17px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
    variant === "primary" && "bg-coral text-white shadow-[0_10px_30px_rgba(255,77,58,0.28)]",
    variant === "secondary" && "bg-panel-2 text-cream",
    variant === "ghost" && "h-11 bg-transparent text-mute",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function Cover({
  label,
  accent,
  size = 64,
  mystery = false,
  image = null,
}: {
  label?: string;
  accent?: string;
  size?: number;
  mystery?: boolean;
  image?: string | null;
}) {
  const letter = mystery ? "?" : (label?.replace(/[^A-Za-z0-9]/g, "").slice(0, 1) || "♪");
  return (
    <div
      className="cover"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: mystery
          ? "radial-gradient(circle at 40% 35%, #3a3644, #121118 62%)"
          : accent,
      }}
      aria-hidden
    >
      {image && !mystery ? (
        <Image src={image} alt="" width={size} height={size} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  );
}

export function Equalizer({ live = false }: { live?: boolean }) {
  return (
    <span className={cn("eq", live && "eq-live")} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function Avatar({ name, id }: { name: string; id: string }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-ink"
      style={{ background: avatarColor(id) }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Modal({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 grid items-end bg-black/60 p-4 sm:items-center">
      <div className="rise w-full rounded-3xl bg-panel p-5">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-mute">{body}</p>
        <div className="mt-5 grid gap-2">
          <Button onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function Splash() {
  return (
    <div className="safe-top flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-coral shadow-[0_20px_60px_rgba(255,77,58,0.35)]">
        <span className="h-8 w-8 rounded-full bg-ink" />
      </div>
      <p className="mt-8 font-display text-4xl font-extrabold tracking-tight">Timeline</p>
      <p className="mt-2 text-mute">Setting the table…</p>
    </div>
  );
}
