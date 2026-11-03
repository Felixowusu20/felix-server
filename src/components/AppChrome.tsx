"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  GearIcon,
  HomeIcon,
  PlusCircleIcon,
  StackIcon,
} from "./icons";
import { InstallPrompt } from "./InstallPrompt";

const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/sites",
    label: "Sites",
    Icon: StackIcon,
    match: (p: string) => p === "/sites" || p.startsWith("/projects/"),
  },
  {
    href: "/admin",
    label: "Add",
    Icon: PlusCircleIcon,
    match: (p: string) => p === "/admin",
  },
  {
    href: "/settings",
    label: "Settings",
    Icon: GearIcon,
    match: (p: string) => p === "/settings",
  },
] as const;

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isAuth = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("app-auth", isAuth);
    document.documentElement.classList.toggle("app-shell", !isAuth);
    return () => {
      document.documentElement.classList.remove("app-auth", "app-shell");
    };
  }, [isAuth]);

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <div className="app-frame">
      <div className="app-content">{children}</div>

      <div className="app-install-slot lg:hidden">
        <InstallPrompt />
      </div>

      <nav className="app-tabbar" aria-label="App">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`app-tab ${active ? "app-tab--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
