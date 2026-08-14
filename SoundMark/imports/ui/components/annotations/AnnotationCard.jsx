import { Meteor } from "meteor/meteor";
import { Trash2 } from "lucide-react";
import { deleteAnnotation } from "../../services/annotationService";
import { formatMs } from "../../utils/time";

export const AnnotationCard = ({ annotation, onSeek }) => {
  // Deletes this annotation via the backend
  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteAnnotation(annotation);
  };

  return (
    //Make the Card seek to the annotation
    <button
      type="button"
      onClick={() => onSeek(annotation.start)}
      className="w-full text-left px-4 py-3 rounded-box border border-base-300/60 bg-base-100 shadow-sm hover:shadow-md hover:border-base-content/20 transition-all group"
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
