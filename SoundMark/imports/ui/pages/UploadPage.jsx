import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { upload } from "../services/audioService";

export const UploadPage = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const key = await upload(file);

      navigate("/player", {
        state: { key }
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1>Upload Audio</h1>
      <input type="file" accept="audio/*" onChange={handleChange} />
    </div>
  );
};
