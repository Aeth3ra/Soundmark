import { Trash2, Eye, EyeOff, User, Pencil } from "lucide-react";
import { deleteAnnotation } from "../../services/annotationService";
import { formatMs } from "../../utils/time";
import { DEFAULT_ANNOTATION_COLOUR } from "../../lib/annotationColours";

export const AnnotationCard = ({
  annotation,
  onSeek,
  hidden,
  onToggleHidden,
  authorName,
  onEdit
}) => {
  // Deletes this annotation via the backend
  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteAnnotation(annotation);
  };

  //Toggle whether annotation is hidden or not
  const handleToggleHidden = (e) => {
    e.stopPropagation();
    onToggleHidden?.(annotation._id);
  };

  // Edit this annotation
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(annotation);
  };

  // Seeks to the annotation on click, or Enter/Space for keyboard users
  const handleSeek = () => onSeek(annotation.start);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // stop page scroll on Space
      handleSeek();
    }
  };

  const colour = annotation.colour || DEFAULT_ANNOTATION_COLOUR;
  const title = annotation.title?.trim() || "Untitled annotation";
  const author = authorName || "Unknown user";

  const durationMs =
    annotation.end != null ? (annotation.end - annotation.start) * 1000 : null;

  return (
    //Make the Card seek to the annotation
    <div
      role="button"
      tabIndex={0}
      onClick={handleSeek}
      onKeyDown={handleKeyDown}
      className={`relative w-full text-left pl-4 pr-3 py-3 rounded-box border border-base-300/60 bg-base-100 shadow-sm hover:shadow-md hover:border-base-content/20 transition-all group overflow-hidden ${
        hidden ? "opacity-50" : ""
      }`}
    >
      {/* Colour strip along the left edge */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: colour }}
      />

      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-base-content leading-snug truncate">
          {title}
        </h3>

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Show/hide on waveform */}
          <button
            type="button"
            onClick={handleToggleHidden}
            title={hidden ? "Show on waveform" : "Hide from waveform"}
            className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-base-content transition-opacity"
          >
            {hidden ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
          
          {/* Edit */}
          <button
            type="button"
            onClick={handleEdit}
            title="Edit annotation"
            className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary transition-opacity"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete annotation"
            className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Timestamp + duration */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono font-medium text-primary">
          {formatMs(annotation.start * 1000)}
          {annotation.end != null && ` – ${formatMs(annotation.end * 1000)}`}
        </span>
        {durationMs != null && (
          <span className="badge badge-ghost badge-xs font-mono">
            {formatMs(durationMs)}
          </span>
        )}
      </div>

      {/* Tags */}
      {annotation.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {annotation.tags.map((tag) => (
            <span key={tag} className="badge badge-sm badge-outline">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Comment */}
      {annotation.comment && (
        <p className="text-sm text-base-content/60 line-clamp-2 mb-1.5">
          {annotation.comment}
        </p>
      )}

      {/* Author */}
      <div className="flex items-center gap-1 text-xs text-base-content/40">
        <User className="h-3 w-3" />
        <span className="truncate">{author}</span>
      </div>
    </div>
  );
};
