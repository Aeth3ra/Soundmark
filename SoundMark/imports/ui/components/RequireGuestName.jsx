import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useGuestAccount } from "../hooks/useGuestAccount";

export const RequireGuestName = () => {
  const { name, isReady } = useGuestAccount();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!name) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
};
