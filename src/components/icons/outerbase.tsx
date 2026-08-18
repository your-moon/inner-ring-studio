import { SVGProps } from "react";

// Inner Ring Studio brand mark. Export names kept for import compatibility.

export function OuterbaseIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function OuterbaseLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 210 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="3" />
      <circle cx="20" cy="20" r="6" fill="currentColor" />
      <text
        x="46"
        y="27"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="22"
        fontWeight="600"
      >
        Inner Ring Studio
      </text>
    </svg>
  );
}

export default OuterbaseLogo;
