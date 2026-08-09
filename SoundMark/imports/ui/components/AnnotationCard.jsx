import { Meteor } from "meteor/meteor";
import { Trash2 } from "lucide-react";

// Formats milliseconds as m:ss
const formatMs = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const AnnotationCard = ({ annotation, onSeek }) => {
  // Deletes this annotation via the backend
  const handleDelete = async (e, annotationId) => {
    e.stopPropagation();
    await deleteAnnotation(annotationId);
  };

  return (
    //Make the Card seek to the annotation
    <button
      type="button"
      onClick={() => onSeek(annotation.start)}
      className="w-full text-left px-5 py-4 hover:bg-base-200/60 transition-colors group"
    >
      <div className="flex items-center justify-between mb-1.5">
        {/* The Time-Region */}
        <span className="text-sm font-mono font-medium text-primary">
          {formatMs(annotation.start * 1000)}
          {annotation.end != null && ` - ${formatMs(annotation.end * 1000)}`}
        </span>
        {/* The Delete Button */}
        <button
          type="button"
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Lists out the tags */}
      {annotation.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {annotation.tags.map((tag) => (
            <span key={tag} className="badge badge-sm badge-outline">
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* Comment Section */}
      {annotation.comment && (
        <p className="text-sm text-base-content/60 line-clamp-2">
          {annotation.comment}
        </p>
      )}
    </button>
  );
};
