import { X } from "lucide-react";
import { EffectCard } from "./EffectCard";

export const EffectList = ({
  effects,
  isOpen,
  isLoading,
  onClose,
  onSeek,
  userId,
  isHost
}) => {
  if (!isOpen) return null;

  return (
    <aside
      aria-label="Audio effects"
      className="shrink-0 w-80 overflow-hidden border-l border-base-300 bg-base-200"
    >
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div className="flex items-baseline gap-2">
            <h2 className="font-semibold">Effects</h2>

            <span className="text-sm text-base-content/40">
              {effects.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close effects"
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p
              role="status"
              className="p-5 text-sm text-base-content/60"
            >
              Loading effects...
            </p>
          ) : effects.length === 0 ? (
            <p className="p-5 text-sm text-base-content/60">
              No effects yet. Select a region and choose Apply effect.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 p-3">
              {effects.map((effect) => (
                <li key={effect._id}>
                  <EffectCard
                    effect={effect}
                    onSeek={onSeek}
                    userId={userId}
                    isHost={isHost}
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