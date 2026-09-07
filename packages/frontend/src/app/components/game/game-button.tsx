import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "success" | "blue" | "blue-dark" | "blue-outline" | "ghost";
  size?: "md" | "lg" | "xl";
}

const variantConfig = {
  primary: {
    bg: "#58CC02",
    border: "#46A302",
    text: "white",
  },
  success: {
    bg: "#58CC02",
    border: "#46A302",
    text: "white",
  },
  danger: {
    bg: "#FF4B4B",
    border: "#EA2B2B",
    text: "white",
  },
  blue: {
    bg: "#1CB0F6",
    border: "#1899D6",
    text: "white",
  },
  "blue-dark": {
    bg: "#0E7490",
    border: "#0c5a70",
    text: "white",
  },
  "blue-outline": {
    bg: "#E3F4FD",
    border: "#1CB0F6",
    text: "#0E7490",
  },
  ghost: {
    bg: "#FFFFFF",
    border: "#CACACA",
    text: "#AFAFAF",
  },
};

export function GameButton({
  variant = "primary",
  size = "lg",
  className,
  children,
  disabled,
  ...props
}: GameButtonProps) {
  const config = variantConfig[variant];

  const sizeStyles = {
    md: "px-5 py-3 min-h-[48px]",
    lg: "px-6 py-4 min-h-[56px]",
    xl: "px-8 py-5 min-h-[64px]",
  };

  return (
    <button
      disabled={disabled}
      className={cn(
        "duo-btn font-nunito font-black rounded-2xl uppercase tracking-wide",
        "border-2 border-b-[5px] cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:brightness-105",
        sizeStyles[size],
        className
      )}
      style={{
        backgroundColor: disabled ? "#E5E5E5" : config.bg,
        borderColor: disabled ? "#CACACA" : config.border,
        color: disabled ? "#AFAFAF" : config.text,
      }}
      {...props}
    >
      {children}
    </button>
  );
}