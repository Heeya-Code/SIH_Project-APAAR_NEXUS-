// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "btn-press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,box-shadow,border-color] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-navy-900 text-white shadow-card hover:bg-navy-800",
        teal: "bg-teal-500 text-navy-950 shadow-card hover:bg-[#2bb8b2]",
        secondary: "border border-line-strong bg-white text-navy-900 shadow-card hover:bg-paper",
        ghost: "text-slate-600 hover:bg-navy-900/5 hover:text-navy-900",
        destructive: "bg-red-600 text-white shadow-card hover:bg-red-700",
        link: "h-auto p-0 text-blue-600 underline-offset-4 hover:underline",
      },
      size: { default: "h-9 px-4", sm: "h-8 px-3 text-[13px]", lg: "h-11 px-6 text-[15px]", icon: "size-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
