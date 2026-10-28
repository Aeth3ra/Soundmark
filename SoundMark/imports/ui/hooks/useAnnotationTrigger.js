import { useState } from "react";

/**
 * Manages modal/popover trigger state for creating annotations from timeline selections.
 *
 * @returns {{
 *   trigger: { startMs: number, endMs: number|null } | null | undefined,
 *   openAnnotation: (region: { startMs: number, endMs: number|null } | null) => void,
 *   closeAnnotation: () => void
 * }}
 */
export const useAnnotationTrigger = () => {
  const [trigger, setTrigger] = useState(undefined); // undefined = popover closed

  const openAnnotation = (region) => {
    if (!region) {
      setTrigger(null);
      return;
    }
    setTrigger({
      startMs: region.startMs,
      endMs: region.endMs
    });
  };

  const closeAnnotation = () => setTrigger(undefined);

  return { trigger, openAnnotation, closeAnnotation };
};
