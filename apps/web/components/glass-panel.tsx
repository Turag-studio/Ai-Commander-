import type { HTMLAttributes } from "react";

export function GlassPanel({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass-panel rounded-xl p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}
