"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import type { HeroSlideData } from "@/lib/site/get-home";

const INTERVAL_MS = 7000;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the visitor asked for less motion. Assumes yes on the server so nothing autoplays before we know. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(REDUCED_QUERY);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => true,
  );
}

/**
 * Homepage hero: photograph full-bleed, text block on the right.
 * Several slides autoplay with prev/next, dots and a pause button; autoplay
 * never starts for visitors who prefer reduced motion, and stops while the
 * hero is hovered or has keyboard focus. With one slide there are no controls.
 */
export function HeroSlider({ slides, ranchName }: { slides: HeroSlideData[]; ranchName: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const reduced = usePrefersReducedMotion();
  const regionId = useId();
  const count = slides.length;

  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || reduced || paused || interacting) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [count, reduced, paused, interacting, index, go]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${ranchName} highlights`}
      className="relative isolate overflow-hidden bg-night text-on-night"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
    >
      <div id={regionId} aria-live={count > 1 && !paused && !reduced ? "off" : "polite"}>
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              className={
                active
                  ? "relative min-h-[30rem] opacity-100 transition-opacity duration-700 sm:min-h-[34rem] lg:min-h-[38rem]"
                  : "pointer-events-none absolute inset-0 min-h-[30rem] opacity-0 transition-opacity duration-700 sm:min-h-[34rem] lg:min-h-[38rem]"
              }
            >
              {slide.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.photo.src}
                  srcSet={slide.photo.srcSet || undefined}
                  sizes="100vw"
                  alt={slide.photo.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  className="absolute inset-0 -z-20 size-full object-cover"
                  style={{ objectPosition: `${slide.photo.focalX * 100}% ${slide.photo.focalY * 100}%` }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_20%_10%,color-mix(in_oklab,var(--c-primary)_55%,var(--c-night)),var(--c-night))]"
                />
              )}
              {/* Keeps the headline readable on any photograph, light or dark. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-t from-night/85 via-night/35 to-night/10 lg:bg-gradient-to-l lg:from-night/75 lg:via-night/30 lg:to-transparent"
              />

              <div className="mx-auto flex min-h-[inherit] max-w-[88rem] items-end px-[var(--gutter)] pb-16 pt-24 lg:items-center lg:justify-end lg:pb-24">
                <div className="max-w-xl lg:w-[min(34rem,44%)]">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-on-night/75">
                    {ranchName}
                  </p>
                  <div className="mt-3 h-px w-12 bg-accent" />
                  {i === 0 ? (
                    <h1 className="mt-5 font-display text-3xl text-on-night sm:text-[2.5rem] lg:text-[2.75rem]">
                      {slide.headline}
                    </h1>
                  ) : (
                    <h2 className="mt-5 font-display text-3xl text-on-night sm:text-[2.5rem] lg:text-[2.75rem]">
                      {slide.headline}
                    </h2>
                  )}
                  {slide.subheadline ? (
                    <p className="mt-5 max-w-[34ch] font-serif text-lg italic text-on-night/90">{slide.subheadline}</p>
                  ) : null}
                  {slide.cta ? (
                    <Link
                      href={slide.cta.href}
                      tabIndex={active ? 0 : -1}
                      className="mt-8 inline-flex min-h-11 items-center gap-3 bg-primary px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-on-primary no-underline transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--c-primary)_80%,white)]"
                    >
                      {slide.cta.label}
                      <Arrow />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-4 z-10 mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-[var(--gutter)] lg:justify-end">
          <div className="flex items-center gap-1">
            <ControlButton label="Previous slide" onClick={() => go(index - 1)}>
              <path d="M10 3 5 8l5 5" />
            </ControlButton>
            <ol className="flex items-center">
              {slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-label={`Show slide ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => go(i)}
                    className="group inline-flex size-11 items-center justify-center"
                  >
                    <span
                      className={
                        i === index
                          ? "block h-[3px] w-7 bg-accent"
                          : "block h-[3px] w-4 bg-on-night/50 transition-colors group-hover:bg-on-night"
                      }
                    />
                  </button>
                </li>
              ))}
            </ol>
            <ControlButton label="Next slide" onClick={() => go(index + 1)}>
              <path d="m6 3 5 5-5 5" />
            </ControlButton>
            {!reduced ? (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                className="ml-2 inline-flex min-h-11 items-center px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-on-night/85 hover:text-on-night"
              >
                {paused ? "Play" : "Pause"}
                <span className="sr-only"> slideshow</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center text-on-night/85 hover:text-on-night"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}
