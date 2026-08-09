import { Meteor } from "meteor/meteor";
import { X, Trash2, Tag as TagIcon } from "lucide-react";
import { AnnotationCard } from "./AnnotationCard";

const formatMs = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const AnnotationList = ({ annotations, isOpen, onClose, onSeek }) => {
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
              {annotations.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <TagIcon className="h-6 w-6 text-base-content/20" />
              <p className="text-sm text-base-content/40">
                No annotations yet. Drag a region on the waveform to add one.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 p-3">
              {annotations.map((annotation) => (
                <li key={annotation._id}>
                  <AnnotationCard annotation={annotation} onSeek={onSeek} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
};
