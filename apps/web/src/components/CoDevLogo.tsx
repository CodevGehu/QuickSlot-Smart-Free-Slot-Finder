export function CoDevLogo({ large = false }: { large?: boolean }) {
  return (
    <img
      className={`co-dev-logo${large ? " co-dev-logo-large" : ""}`}
      src="/brand/codev-logo.png"
      alt="Co-Dev Club logo"
    />
  );
}
