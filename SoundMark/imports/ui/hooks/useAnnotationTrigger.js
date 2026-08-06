import { useState } from "react";

/**
 * Handles converting regions into an trigger that triggers the annotation form
 * startMs/endMs must be milliseconds
 * @returns
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
