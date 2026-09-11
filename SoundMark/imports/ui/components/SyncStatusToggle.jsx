import React from "react";

export function SyncStatusToggle({ targetUser, onUnlock }) {
  const isLocked = Boolean(targetUser);

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-md border transition-colors ${
        isLocked
          ? "bg-base-200 border-base-300"
          : "bg-base-100 border-base-200 opacity-60"
      }`}
    >
      {/* Indicator light */}
      <span className="relative flex h-2 w-2">
        {isLocked ? (
          <>
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: targetUser.color }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: targetUser.color }}
            />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-base-content/20" />
        )}
      </span>

      {/* Sync Label */}
      <span className="text-xs font-medium truncate max-w-[140px]">
        {isLocked ? (
          <>
            Sync: <strong>{targetUser.name}</strong>
          </>
        ) : (
          <span className="text-base-content/50">Sync off</span>
        )}
      </span>

      {/* daisyUI toggle switch */}
      <input
        type="checkbox"
        className="toggle toggle-xs toggle-primary"
        checked={isLocked}
        disabled={!isLocked}
        onChange={(e) => {
          if (!e.target.checked && onUnlock) {
            onUnlock();
          }
        }}
        title={
          isLocked
            ? "Unlock / Stop following playhead"
            : "Click a user's marker to follow"
        }
      />
    </div>
  );
}
