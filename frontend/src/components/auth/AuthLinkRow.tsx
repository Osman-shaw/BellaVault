import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AuthLinkRow({ children }: Props) {
  return <p className="auth-link-row">{children}</p>;
}

export function AuthInlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="auth-inline-link">
      {children}
    </Link>
  );
}
