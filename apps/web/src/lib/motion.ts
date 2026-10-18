import type { Variants } from "framer-motion";

/**
 * Shared entrance variants. `prefers-reduced-motion` is handled by wrapping the app's <motion.*>
 * usage with framer-motion's own `useReducedMotion()` where a component needs to skip transforms
 * entirely (parallax, drift) — plain fade/slide variants below are cheap enough to leave as-is since
 * framer-motion's `MotionConfig reducedMotion="user"` (set once in SiteLayout) already clamps every
 * transform-based animation to an instant fade for every <motion.*> on the page.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

/** For elements that should animate once as they scroll into view (news list, feature grid, podium). */
export const viewportOnce = { once: true, margin: "-80px" } as const;
