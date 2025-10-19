import React from "react";

const VisionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src="/vision-logo.png"
    alt="Vision"
    className={className ?? "w-5.5 h-5.5"}
    style={{ filter: "invert(0)" }}
    onError={(e) => {
      // Fallback to a simple V glyph if image missing
      const target = e.currentTarget as HTMLImageElement;
      target.outerHTML = '<div style="font-weight:700;">V</div>';
    }}
  />
);

export default VisionIcon;
