import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { upload } from "../services/audioService";

const ACCEPTED_LABEL = "MP3, WAV, M4A, FLAC · up to 200MB";

export const UploadPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  //Handles uploading the file into cloud
  const runUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setError("Please choose an audio file (MP3, WAV, M4A, FLAC).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const key = await upload(file);
      navigate("/player", { state: { key } });
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-base-300">
      <div className="w-full max-w-md bg-base-100 rounded-box shadow-xl p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">Soundmark</h1>
        {/* Drag/Drop Upload Zone */}
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          className={`w-full max-w-md border-2 border-dashed rounded-box p-12 text-center cursor-pointer transition-colors
          ${dragActive ? "border-primary bg-base-200" : "border-base-300 bg-base-200/40"}`}
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
          ) : (
            <>
              <p className="font-medium">Drag an audio file here</p>
              <p className="text-sm text-base-content/60 mt-1">
                or click to browse
              </p>
            </>
          )}
        </div>
      </div>
      {/* Error Messages */}
      {error && <p className="text-error text-sm mt-4">{error}</p>}
    </div>
  );
};
