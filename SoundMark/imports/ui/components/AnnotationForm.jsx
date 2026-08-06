import { useState, useEffect, useMemo } from "react";
import { Meteor } from "meteor/meteor";
import { X, Search, ChevronDown } from "lucide-react";
import { TAG_CATEGORIES, ALL_PREDEFINED_TAGS } from "../lib/tags";

export const AnnotationForm = ({ trigger, fileId, createdBy, onClose }) => {
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [openCategories, setOpenCategories] = useState(new Set(["Structure"]));

  // Reset form state each time a new trigger comes in
  useEffect(() => {
    setSelectedTags([]);
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
      await Meteor.callAsync("annotations.create", {
        fileId,
        start: trigger.startMs / 1000,
        end: trigger.endMs != null ? trigger.endMs / 1000 : null,
        tags: selectedTags,
        comment
      });
      onClose();
    } catch (err) {
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
      className="bg-base-100 rounded-box shadow-xl p-4 w-80 flex flex-col gap-3 border border-base-300"
    >
      {/* Header of the form */}
      <div className="flex items-center justify-between">
        {trigger ? (
          <p className="text-sm font-mono text-base-content/70">
            {trigger.endMs != null
              ? `${trigger.startMs} ms - ${trigger.endMs} ms`
              : `at ${trigger.startMs} ms`}
          </p>
        ) : (
          <p className="text-sm text-base-content/50">No region selected</p>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-xs btn-circle"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Tags - only appear if triggered*/}
      {trigger && (
        <>
          {/* Tag search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Search tags..."
              className="input input-sm input-bordered w-full pl-8"
            />
          </div>

          {/* Tag picker: search results OR grouped categories */}
          <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
            {searchResults ? (
              <div className="flex flex-wrap gap-2">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-base-content/40">
                    No matching tags
                  </p>
                ) : (
                  searchResults.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`btn btn-xs ${selectedTags.includes(tag) ? "btn-primary" : "btn-outline"}`}
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
                    className="flex items-center gap-1 text-xs font-medium text-base-content/60 w-full py-1"
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        openCategories.has(category) ? "" : "-rotate-90"
                      }`}
                    />
                    {category}
                  </button>
                  {openCategories.has(category) && (
                    <div className="flex flex-wrap gap-2 pl-4 pb-1">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`btn btn-xs ${selectedTags.includes(tag) ? "btn-primary" : "btn-outline"}`}
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
              className="input input-sm input-bordered flex-1"
            />
            <button type="button" onClick={addCustomTag} className="btn btn-sm">
              Add
            </button>
          </div>

          {/* Selected tags (predefined + custom, shown together) */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-base-300 pt-2">
              {selectedTags.map((tag) => (
                <span key={tag} className="badge badge-primary gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)"
            className="textarea textarea-bordered textarea-sm w-full"
            rows={2}
          />
        </>
      )}

      {error && <p className="text-error text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="btn btn-primary btn-sm self-start"
      >
        {saving ? "Saving..." : "Save annotation"}
      </button>
    </div>
  );
};
