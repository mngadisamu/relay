// Relay logo: a blue square with an arrow, plus the name.
export function BrandMark({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const box = { sm: "h-7 w-7 rounded-md", md: "h-8 w-8 rounded-lg", lg: "h-10 w-10 rounded-[9px]" }[size];
  const icon = { sm: 15, md: 17, lg: 22 }[size];
  const text = { sm: "text-[17px]", md: "text-lg", lg: "text-[26px]" }[size];

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${box} flex items-center justify-center ${inverted ? "bg-white" : "bg-brand"}`}>
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke={inverted ? "#0b3d73" : "#ffffff"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12h12" />
          <path d="M12 6l6 6-6 6" />
        </svg>
      </span>
      <span className={`${text} font-bold tracking-tight ${inverted ? "text-white" : "text-ink"}`}>Relay</span>
    </span>
  );
}
