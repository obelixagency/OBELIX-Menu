type Props = {
  displayName: string;
  locale?: "ar" | "en";
};

export function PublicMenuFooter({ displayName }: Props) {
  const year = 2026;
  return (
    <footer className="mt-10 border-t border-black/10 px-4 py-8 text-center text-xs leading-relaxed text-black/50">
      <p>
        © Copyrights {year} - {displayName} - All rights reserved
      </p>
      <p className="mt-2">
        Powered By{" "}
        <a
          href="http://obelixagency.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--brand-primary)] underline-offset-2 hover:underline"
        >
          OBELIX Agency
        </a>
      </p>
    </footer>
  );
}
