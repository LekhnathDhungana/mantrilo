export default function Brand() {
  return (
    <span className="brand">
      <svg viewBox="0 0 64 64" width="34" height="34" fill="none" aria-hidden="true">
        {[0, 30, 60, 90, 120, 150].map((a) => (
          <ellipse
            key={a}
            cx="32"
            cy="32"
            rx="11"
            ry="27"
            transform={`rotate(${a} 32 32)`}
            stroke="currentColor"
            strokeWidth=".8"
          />
        ))}
        <circle cx="32" cy="32" r="4" fill="currentColor" />
      </svg>
      <span>
        mantrilo<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
