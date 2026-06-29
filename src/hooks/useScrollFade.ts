import { useEffect } from "react";

/**
 * Adds a smooth fade/translate effect to any element with `data-fade`
 * as it enters or leaves the viewport. Used on the landing page.
 */
export function useScrollFade() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-fade]");
    els.forEach((el) => el.classList.add("fade-init"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("fade-in-view");
          else e.target.classList.remove("fade-in-view");
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}