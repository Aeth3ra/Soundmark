import { UserPlayhead } from "./UserPlayhead";

export const UserPresenceOverlay = ({
  users = [],
  duration,
  waveformWidth,
  followingUserId,
  onToggleLock
}) => {
  if (!duration || duration <= 0 || !waveformWidth || waveformWidth <= 0) {
    return null;
  }

  return (
    <>
      {users.map((user) => {
        const x = (user.position / duration) * waveformWidth;
        const isLocked = user.userId === followingUserId;

        return (
          <UserPlayhead
            key={user.userId}
            user={user}
            positionPx={x}
            isLocked={isLocked}
            onToggleLock={onToggleLock}
          />
        );
      })}
    </>
  );
};
