import { useState } from "react";
import { colourForId } from "../lib/userColour";

export const WorkspaceUsers = ({ currentUser, otherUsers = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalUsers = 1 + otherUsers.length;
  const visibleUsers = otherUsers.slice(0, 4);
  const remainingUsers = Math.max(0, otherUsers.length - 4);

  return (
    <div className="relative">
      {/* Avatar group */}
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center hover:opacity-90 transition-opacity"
        aria-label="View workspace users"
      >
        <div className="flex items-center -space-x-2">
          {/* Current user */}
          <div
            className="tooltip tooltip-bottom z-20"
            data-tip={`${currentUser.name || "You"} (you)`}
          >
            <div
              className="h-8 w-8 rounded-full border-2 border-base-100
                         flex items-center justify-center
                         text-xs font-semibold text-white"
              style={{
                backgroundColor: colourForId(currentUser.userId)
              }}
            >
              {(currentUser.name || "Y").charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Other users */}
          {visibleUsers.map((user, index) => (
            <div
              key={user.userId}
              className="tooltip tooltip-bottom"
              data-tip={user.name || "Guest"}
              style={{
                zIndex: 10 - index
              }}
            >
              <div
                className="h-8 w-8 rounded-full border-2 border-base-100
                           flex items-center justify-center
                           text-xs font-semibold text-white"
                style={{
                  backgroundColor: user.color || colourForId(user.userId)
                }}
              >
                {(user.name || "G").charAt(0).toUpperCase()}
              </div>
            </div>
          ))}

          {/* Remaining users */}
          {remainingUsers > 0 && (
            <div
              className="h-8 w-8 rounded-full border-2 border-base-100
                         bg-base-300 flex items-center justify-center
                         text-xs font-semibold"
            >
              +{remainingUsers}
            </div>
          )}
        </div>

        <span className="ml-3 text-sm text-base-content/60">
          {totalUsers} {totalUsers === 1 ? "user" : "users"}
        </span>
      </button>

      {/* User list popover */}
      {isOpen && (
        <div
          className="absolute right-0 top-11 z-50
                     w-64 rounded-box bg-base-100
                     border border-base-300 shadow-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">People in this session</h3>

            <span className="text-xs text-base-content/50">{totalUsers}</span>
          </div>

          <div className="flex flex-col gap-2">
            {/* Current user */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-base-200/60">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center
                           text-xs font-semibold text-white"
                style={{
                  backgroundColor: colourForId(currentUser.userId)
                }}
              >
                {(currentUser.name || "Y").charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentUser.name || "You"}
                </p>

                <p className="text-xs text-base-content/50">You</p>
              </div>

              <span className="text-xs text-success">Active</span>
            </div>

            {/* Other users */}
            {otherUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center
                             text-xs font-semibold text-white"
                  style={{
                    backgroundColor: user.color || colourForId(user.userId)
                  }}
                >
                  {(user.name || "G").charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || "Guest"}
                  </p>

                  <p className="text-xs text-base-content/50">Collaborator</p>
                </div>

                <span className="text-xs text-success">Active</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
