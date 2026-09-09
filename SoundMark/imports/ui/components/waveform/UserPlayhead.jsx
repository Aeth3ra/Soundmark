export const UserPlayhead = ({ user, positionPx, isLocked, onToggleLock }) => {
  if (positionPx === undefined || positionPx === null) return null;

  return (
    <div
      className="absolute top-0 bottom-0 z-10 cursor-pointer group"
      style={{
        left: `${positionPx}px`,
        transform: "translateX(-50%)"
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggleLock(user.userId);
      }}
    >
      {/* Badge button */}
      <button
        type="button"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                   text-[10px] leading-none font-medium text-white
                   px-2 py-1 rounded-full whitespace-nowrap shadow-md
                   flex items-center gap-1 transition-all group-hover:scale-105
                   ${isLocked ? "ring-2 ring-white scale-105" : ""}`}
        style={{ backgroundColor: user.color }}
      >
        <span>{"👤"}</span>
        <span>{user.name}</span>
      </button>

      {/* Playhead line */}
      <div
        className="h-full w-0.5 opacity-80"
        style={{ backgroundColor: user.color }}
      />
    </div>
  );
};
