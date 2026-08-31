import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { upload } from "../services/audioService";
import { Meteor } from "meteor/meteor";
import { useGuestAccount } from "../hooks/useGuestAccount";
import { SessionEndedToast } from "../components/SessionEndToast";

export const UploadPage = () => {
  // Users
  const { userId, name, isReady } = useGuestAccount();
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  // Page navigate
  const navigate = useNavigate();

  //Audio Upload
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  //Handles uploading the file into cloud
  const runUpload = async (file) => {
    if (!file) return;
    if (!name) {
      setError("Enter your name before uploading an audio file.");
      return;
    }
    if (!file.type.startsWith("audio/")) {
      setError("Please choose an audio file (MP3, WAV, M4A, FLAC).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fileId = await upload(file);
      navigate(`/player/${fileId}`);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  //Handles drag and drop for files
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    runUpload(e.dataTransfer.files?.[0]);
  };

  // Handles when user enters guest name
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError("Enter a name to continue.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await Meteor.callAsync("users.setDisplayName", trimmed);
    } catch (err) {
      setError("Couldn't save your name. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Wait for guest account to initialise
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-base-300">
      <div className="w-full max-w-md bg-base-100 rounded-box shadow-xl p-10 flex flex-col items-center">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/icon-512.png" alt="SoundMark logo" className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Soundmark</h1>
        </div>

        <SessionEndedToast />

        {/* Guest Name */}
        {!name ? (
          <form onSubmit={handleNameSubmit} className="w-full mb-6">
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
              />

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !draftName.trim()}
              >
                {saving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Join"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="w-full mb-6 text-center">
            <p className="text-sm text-base-content/60">Welcome,</p>
            <p className="font-semibold text-lg">{name}</p>
          </div>
        )}

        {/* Drag/Drop Upload Zone */}
        <div
          onClick={() => {
            if (name && !uploading) {
              inputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (name && !uploading) {
              setDragActive(true);
            }
          }}
          onDragLeave={() => setDragActive(false)}
          className={`w-full max-w-md border-2 border-dashed rounded-box p-12 text-center cursor-pointer transition-colors
          ${
            !name
              ? "border-base-300 bg-base-200/20 opacity-50 cursor-not-allowed"
              : dragActive
                ? "border-primary bg-base-200"
                : "border-base-300 bg-base-200/40"
          }`}
        >
          {/* Click Upload */}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => runUpload(e.target.files[0])}
          />

          {/* Loading/Instruction */}
          {uploading ? (
            <span className="loading loading-spinner loading-lg text-primary"></span>
          ) : !name ? (
            <>
              <p className="font-medium">Enter your name first</p>
              <p className="text-sm text-base-content/60 mt-1">
                Your name is required before uploading
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Drag an audio file here</p>
              <p className="text-sm text-base-content/60 mt-1">
                or click to browse
              </p>
            </>
          )}
        </div>
        <br></br>
      </div>
      {/* Error Messages */}
      {error && <p className="text-error text-sm mt-4">{error}</p>}
    </div>
  );
};
