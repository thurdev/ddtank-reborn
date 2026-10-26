import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (news list, feature grid, podium)
// needs one to even mount. A no-op stub is enough — in tests everything should just render eagerly,
// which "observe → never fire" does not give us, so we report every entry as immediately intersecting.
class FakeIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
if (!window.IntersectionObserver) {
  window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver = window.IntersectionObserver;
}

// jsdom has no matchMedia; framer-motion's useReducedMotion() and our own prefers-reduced-motion
// checks call it on mount. A minimal "never matches" stub is enough for tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledFrame: "bypass" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// jsdom has no ResizeObserver; the Play page measures its stage with one (useStageScale).
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
