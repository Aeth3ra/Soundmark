import { UserPlayhead } from "./UserPlayhead";

export const UserPresenceOverlay = ({
  users = [],
  duration,
  waveformWidth
}) => {
  if (!duration || duration <= 0 || !waveformWidth || waveformWidth <= 0) {
    return null;
  }

  return (
    <>
      {users.map((user) => {
        const x = (user.position / duration) * waveformWidth;
        return <UserPlayhead key={user.userId} user={user} positionPx={x} />;
      })}
    </>
  );
};
