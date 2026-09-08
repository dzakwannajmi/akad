// Single spinner used for every loading state in the app, so a "working on
// it" moment always looks the same regardless of which page or button
// triggered it. Renders `currentColor` for the stroke, so it inherits
// whatever text color the surrounding element sets (e.g. text-black on an
// accent button, text-white/60 on a muted row) instead of needing a
// separate color prop.
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 0h24v24H0z" fill="none" />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 3c4.97 0 9 4.03 9 9"
      >
        <animateTransform
          attributeName="transform"
          dur="1.5s"
          repeatCount="indefinite"
          type="rotate"
          values="0 12 12;360 12 12"
        />
      </path>
    </svg>
  );
}
