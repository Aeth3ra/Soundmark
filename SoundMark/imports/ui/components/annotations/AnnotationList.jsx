import { X, Plus, Tag as TagIcon, Filter } from "lucide-react";
import { AnnotationCard } from "./AnnotationCard";
import { useMemo } from "react";
export const AnnotationList = ({
  annotations,
  isOpen,
  onClose,
  onSeek,
  selectedTags = [],
  onToggleTagFilter,
  onClearFilters,
  hiddenIds,
  onToggleHidden,
  onEdit,
  onCreate,
  analyses = {},
  userNames = {}
}) => {
  // All tags currently in use, for the filter chip row
  const availableTags = useMemo(() => {
    const set = new Set();
    annotations.forEach((a) => a.tags?.forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [annotations]);

  // Annotation must include every selected tag to show in the list
  const filteredAnnotations = useMemo(() => {
    if (selectedTags.length === 0) return annotations;
    return annotations.filter((a) =>
      selectedTags.every((tag) => a.tags?.includes(tag))
    );
  }, [annotations, selectedTags]);

  const isFiltering = selectedTags.length > 0;
  return (
    <aside
      className={`shrink-0 overflow-hidden border-l border-base-300 bg-base-200 transition-all duration-300 ${
        isOpen ? "w-80" : "w-0"
      }`}
    >
      {/* Fixed width inner wrapper so content doesn't reflow/squash while collapsing */}
      <div className="w-80 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div className="flex items-baseline gap-2">
            <h2 className="font-semibold text-base-content">Annotations</h2>
            <span className="text-sm text-base-content/40">
              {isFiltering
                ? `${filteredAnnotations.length}/${annotations.length}`
                : annotations.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onCreate && (
              <button
                type="button"
                onClick={onCreate}
                className="btn btn-primary btn-sm gap-1"
                title="Create annotation (Ctrl/Cmd+A)"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close annotations"
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tag filter chips */}
        {availableTags.length > 0 && (
          <div className="px-4 py-3 border-b border-base-300 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/40">
                <Filter className="h-3 w-3" />
                Filter by tag
              </span>
              {isFiltering && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTagFilter?.(tag)}
                  className={`btn btn-xs rounded-full ${
                    selectedTags.includes(tag) ? "btn-primary" : "btn-outline"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <TagIcon className="h-6 w-6 text-base-content/20" />
              <p className="text-sm text-base-content/40">
                No annotations yet. Drag a region on the waveform to add one.
              </p>
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <TagIcon className="h-6 w-6 text-base-content/20" />
              <p className="text-sm text-base-content/40">
                No annotations match the selected tags.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 p-3">
              {filteredAnnotations.map((annotation) => (
                <li key={annotation._id}>
                  <AnnotationCard
                    annotation={annotation}
                    onSeek={onSeek}
                    hidden={hiddenIds?.has(annotation._id)}
                    onToggleHidden={onToggleHidden}
                    onEdit={onEdit}
                    analysis={analyses[annotation._id]}
                    authorName={userNames[annotation.createdBy]}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
};
