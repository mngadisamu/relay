"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin blue bar across the top while the next page loads, like GitHub or Gmail.
// The current page stays on screen until the new one is ready, instead of the
// whole screen being swapped for grey boxes.
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // A new page has arrived: hide the bar.
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Show the bar when someone clicks a link to another page in Relay.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // mailto: and other sites
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page
      setLoading(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Never leave the bar stuck if something goes wrong.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 10_000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden">
      <div
        className={`h-full bg-brand transition-[width,opacity] ease-out ${
          loading ? "w-[85%] opacity-100 duration-[2500ms]" : "w-full opacity-0 duration-300"
        }`}
      />
    </div>
  );
}
