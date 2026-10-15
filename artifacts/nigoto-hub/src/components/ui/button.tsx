import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-accent text-paper-3 hover:opacity-90",
        ink: "bg-ink text-paper-3 hover:opacity-90",
        ghost: "border border-line bg-paper-3 text-ink hover:bg-paper-2",
        danger: "bg-accent/15 text-accent hover:bg-accent/25",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({
  className,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
