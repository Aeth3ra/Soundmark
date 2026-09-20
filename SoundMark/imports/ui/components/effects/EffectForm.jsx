import { useState } from "react";
import { X } from "lucide-react";
import { createEffect } from "../../services/effectsService";
import { formatMs } from "../../utils/time";

export const EffectForm = ({
  fileId,
  region,
  duration,
  order,
  onClose
}) => {
  const [targetRms, setTargetRms] = useState("0.1");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (
      !region ||
      !Number.isFinite(region.start) ||
      !Number.isFinite(region.end) ||
      !Number.isFinite(duration) ||
      region.start < 0 ||
      region.end <= region.start ||
      region.end > duration
    ) {
      setError("Select a valid region within the audio first.");
      return;
    }

    const target = Number(targetRms);

    if (
      targetRms.trim() === "" ||
      !Number.isFinite(target) ||
      target <= 0 ||
      target > 1
    ) {
      setError("Enter a target RMS greater than 0 and at most 1.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await createEffect({
        fileId,
        type: "normalize",
        start: region.start,
        end: region.end,
        params: {
          mode: "rms",
          targetRms: target
        },
        enabled: true,
        order
      });

      onClose();
    } catch (err) {
      setError(
        err.reason ||
        err.message ||
        "Couldn't save the effect. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      role="dialog"
      aria-labelledby="effect-form-title"
      onSubmit={handleSubmit}
      noValidate
      style={{
        position: "fixed",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 50
      }}
      className="bg-base-100 rounded-2xl shadow-2xl p-6 w-104 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto flex flex-col gap-5 border border-base-300"
    >
      <div className="flex items-center justify-between pb-4 border-b border-base-300">
        <div>
          <h2 id="effect-form-title" className="font-semibold">
            New effect
          </h2>

          {region && (
            <p className="text-sm font-mono text-base-content/60">
              {formatMs(region.start * 1000)}
              {" – "}
              {formatMs(region.end * 1000)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close effect form"
          className="btn btn-ghost btn-sm btn-circle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="font-medium">RMS normalisation</p>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="effect-target"
          className="text-sm font-medium"
        >
          Target RMS
        </label>

        <input
          id="effect-target"
          type="number"
          min="0"
          max="1"
          step="any"
          required
          value={targetRms}
          disabled={saving}
          onChange={(event) => setTargetRms(event.target.value)}
          className="input input-bordered w-full"
        />
      </div>

      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="btn btn-ghost"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? "Saving..." : "Save effect"}
        </button>
      </div>
    </form>
  );
};