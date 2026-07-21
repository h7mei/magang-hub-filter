import { Building2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface CompanyLogoBadgeProps {
  companyName: string;
  companyLogoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CompanyLogoBadge({
  companyName,
  companyLogoUrl,
  size = "md",
  className,
}: CompanyLogoBadgeProps) {
  const [failed, setFailed] = useState(false);
  const dimension =
    size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10";

  return (
    <div
      className={cn(
        `flex ${dimension} shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background text-muted-foreground shadow-sm`,
        className,
      )}
    >
      {companyLogoUrl && !failed ? (
        <img
          src={companyLogoUrl}
          alt={`${companyName} logo`}
          className="size-full object-contain p-1"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Building2 className={size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4"} />
      )}
    </div>
  );
}
