import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";

// jsdom has no ResizeObserver; Radix UI (Dialog/Tabs/Switch, used throughout the admin) touches it in some
// code paths. A no-op stub is enough — tests never assert on size-driven layout.
class FakeResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!window.ResizeObserver) {
  window.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
}

// jsdom doesn't implement the Pointer Events capture API or scrollIntoView; Radix UI's pointer-based
// interactions (Dialog/Switch/Tabs) call these unconditionally. No-op stubs so `userEvent.click()` etc. don't
// throw — same workaround used by Radix's own test suite under jsdom.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledFrame: "bypass" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
});
afterAll(() => server.close());
