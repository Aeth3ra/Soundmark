export const UserPlayhead = ({ user, positionPx }) => {
  if (positionPx === undefined || positionPx === null) return null;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-10"
      style={{
        left: `${positionPx}px`,
        transform: "translateX(-50%)"
      }}
    >
      {/* User name badge */}
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                   text-[10px] leading-none font-medium text-white
                   px-1.5 py-1 rounded-full whitespace-nowrap shadow-sm"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </span>

      {/* Playhead line */}
      <div
        className="h-full w-0.5 opacity-80"
        style={{ backgroundColor: user.color }}
      />
    </div>
  );
};
