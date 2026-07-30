import { useNavigate } from "react-router-dom";

export const UploadPage = () => {
  const navigate = useNavigate();
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      navigate("/player", { state: { file } });
    }
  };

  return (
    <div>
      <h1>Upload Audio</h1>
      <input type="file" accept="audio/*" onChange={handleChange} />
    </div>
  );
};
