import { useState, useEffect, useMemo } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { TAG_CATEGORIES, ALL_PREDEFINED_TAGS } from "../../lib/tags";
import { formatMs } from "../../utils/time";
import {
  ANNOTATION_COLOURS,
  DEFAULT_ANNOTATION_COLOUR
} from "../../lib/annotationColours";
import { createAnnotation } from "../../services/annotationService";

export const AnnotationForm = ({ trigger, fileId, onClose }) => {
  const [title, setTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [colour, setColour] = useState(DEFAULT_ANNOTATION_COLOUR);
  const [customTag, setCustomTag] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [openCategories, setOpenCategories] = useState(new Set(["Structure"]));

  // Reset form state each time a new trigger comes in
  useEffect(() => {
    setTitle("");
    setSelectedTags([]);
    setColour(DEFAULT_ANNOTATION_COLOUR);
    setCustomTag("");
    setComment("");
    setTagSearch("");
    setError(
      trigger === null ? "No region selected. Drag to select one first." : null
    );
  }, [trigger]);

  // Handles showing the tags results during searching
  const searchResults = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return null;
    return ALL_PREDEFINED_TAGS.filter((tag) => tag.toLowerCase().includes(q));
  }, [tagSearch]);

  if (trigger === undefined) return null; // not triggered at all

  //Function that handles toggling off and on the tags
  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Function that adds the custom tag into tags list
  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (!trimmed || selectedTags.includes(trimmed)) return;
    setSelectedTags((prev) => [...prev, trimmed]);
    setCustomTag("");
  };

  // Function to remove a specific tag
  const removeTag = (tag) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  // Function that toggles whether to see any catergory of tags
  const toggleCategory = (category) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  // Functtion that handles when the users submits an annotation
  const handleSubmit = async () => {
    if (!trigger) {
      setError("No region selected. Drag to select one first.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      // Calls meteor backend
      await createAnnotation({
        fileId,
        title,
        colour,
        start: trigger.startMs / 1000,
        end: trigger.endMs != null ? trigger.endMs / 1000 : null,
        tags: selectedTags,
        comment
      });
      onClose();
    } catch {
      setError("Couldn't save the annotation. Try again.");
    } finally {
      setSaving(false);
    }
  };
  // Center location of the form
  const style = {
    position: "fixed",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 50
  };
  return (
    <div
      style={style}
      className="bg-base-100 rounded-2xl shadow-2xl p-6 w-104 max-w-[calc(100vw-2rem)] flex flex-col gap-5 border border-base-300"
    >
      {/* Header of the form */}
      <div className="flex items-center justify-between pb-4 border-b border-base-300">
        <div>
          <p className="text-xs uppercase tracking-wide text-base-content/40 mb-1">
            New annotation
          </p>
          {trigger ? (
            <p className="text-base font-mono font-medium text-base-content/80">
              {trigger.endMs != null
                ? `${formatMs(trigger.startMs)} - ${formatMs(trigger.endMs)} `
                : `at ${formatMs(trigger.startMs)} `}
            </p>
          ) : (
            <p className="text-base text-base-content/50">No region selected</p>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Title + colour - only appear if triggered */}
      {trigger && (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
              Title
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chorus vocal peak"
              className="input input-bordered w-full"
            />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {ANNOTATION_COLOURS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColour(c.value)}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={colour === c.value}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    colour === c.value
                      ? "ring-2 ring-offset-2 ring-offset-base-100 ring-base-content scale-105"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
              Tags
            </p>

            {/* Tag search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="input input-bordered w-full pl-9"
              />
            </div>

            {/* Tag picker: search results OR grouped categories */}
            <div className="max-h-56 overflow-y-auto flex flex-col gap-3 pr-1">
              {searchResults ? (
                <div className="flex flex-wrap gap-2">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-base-content/40 py-2">
                      No matching tags
                    </p>
                  ) : (
                    searchResults.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`btn btn-sm rounded-full ${selectedTags.includes(tag) ? "btn-primary" : "btn-outline"}`}
                      >
                        {tag}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
                  <div key={category}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-1.5 text-sm font-medium text-base-content/60 hover:text-base-content/90 w-full py-1.5"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          openCategories.has(category) ? "" : "-rotate-90"
                        }`}
                      />
                      {category}
                    </button>
                    {openCategories.has(category) && (
                      <div className="flex flex-wrap gap-2 pl-5 pb-2 pt-1">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`btn btn-sm rounded-full ${selectedTags.includes(tag) ? "btn-primary" : "btn-outline"}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Custom tag input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addCustomTag())
                }
                placeholder="Add a custom tag"
                className="input input-bordered flex-1"
              />
              <button type="button" onClick={addCustomTag} className="btn">
                Add
              </button>
            </div>

            {/* Selected tags (predefined + custom, shown together) */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-base-300 pt-3">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="badge badge-primary badge-lg gap-1.5 py-3"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
              Comment
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)"
              className="textarea textarea-bordered w-full"
              rows={3}
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-error text-sm bg-error/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-between items-center pt-1">
        <button type="button" onClick={onClose} className="btn btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn btn-primary px-6"
        >
          {saving ? "Saving..." : "Save annotation"}
        </button>
      </div>
    </div>
  );
};
