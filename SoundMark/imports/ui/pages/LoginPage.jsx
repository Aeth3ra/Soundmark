import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { setDisplayName } from "../services/userService";
import { useGuestAccount } from "../hooks/useGuestAccount";

export const LoginPage = () => {
  // This route is also reachable directly, without RequireGuestName starting a session.
  const { userId, isReady, loginError } = useGuestAccount();
  const canSave = Boolean(userId && isReady && !loginError);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !canSave) return;
    setError(null);
    setSaving(true);

    try {
      await setDisplayName(draftName);
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-base-300">
      <div className="w-full max-w-md bg-base-100 rounded-box shadow-xl p-10 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-8">
          <img src="/icon-512.png" alt="SoundMark logo" className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Soundmark</h1>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <label className="label">
            <span className="label-text font-medium">Enter your name</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Alice"
              className="input input-bordered flex-1"
              disabled={saving}
              maxLength={30}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !canSave || !draftName.trim()}
            >
              {saving ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : !canSave && !loginError ? (
                "Connecting…"
              ) : (
                "Continue"
              )}
            </button>
          </div>
          {(error || loginError) && (
            <p role="alert" className="text-error text-sm mt-4">
              {error || "Couldn't start your session. Refresh and try again."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
