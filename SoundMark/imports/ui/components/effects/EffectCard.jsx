import { useState } from "react";
import { Power, Trash2 } from "lucide-react";
import { updateEffect, deleteEffect } from "../../services/effectsService";
import { formatMs } from "../../utils/time";

export const EffectCard = ({ effect, onSeek, userId, isHost }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const canEdit = Boolean(userId && (isHost || effect.createdBy === userId));
  const invalidNormalisation = effect.type === "normalize" && (
    effect.params?.mode !== "rms" ||
    !Number.isFinite(effect.params?.targetRms) ||
    effect.params.targetRms <= 0 || effect.params.targetRms > 1
  );
  const invalidAmplification = effect.type === "amplify" && (
    !Number.isFinite(effect.params?.gain) ||
    effect.params.gain < 0 || effect.params.gain > 4
  );
  const needsRecreation = invalidNormalisation || invalidAmplification;

  const handleToggle = async () => {
    if (!canEdit || busy || needsRecreation) return;
    setBusy(true);
    setError(null);

    try {
      // The Step 2 API requires all editable fields on every update.
      await updateEffect(effect._id, {
        start: effect.start,
        end: effect.end,
        params: effect.params,
        enabled: !effect.enabled,
        order: effect.order
      });
    } catch (err) {
      setError(err.reason || err.message || "Couldn't update the effect.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || busy) return;
    setBusy(true);
    setError(null);

    try {
      await deleteEffect(effect);
    } catch (err) {
      setError(err.reason || err.message || "Couldn't delete the effect.");
    } finally {
      setBusy(false);
    }
  };

  let title;
  let details;
  if (effect.type === "normalize") {
    title = needsRecreation ? "Normalisation: recreate effect" : "RMS normalisation";
    details = needsRecreation
      ? "Older settings: delete this effect and recreate it with a target RMS."
      : `Target RMS: ${effect.params.targetRms}`;
  } else if (effect.type === "amplify") {
    title = "Region amplification";
    details = needsRecreation
      ? "Invalid gain: delete this effect and recreate it with a gain between 0 and 4."
      : `Gain: ${effect.params.gain}×`;
  } else if (effect.type === "pitchShift") {
    title = "Pitch shift";
    details = `${effect.params?.semitones} semitones`;
  } else {
    title = "Unknown effect";
    details = effect.type;
  }

  return (
    <div className="p-3 rounded-box border border-base-300/60 bg-base-100 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className={`badge badge-sm ${effect.enabled ? "badge-primary" : "badge-ghost"}`}>
          {effect.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <button type="button" onClick={() => onSeek(effect.start)} className="text-xs font-mono text-primary hover:underline mt-2">
        {formatMs(effect.start * 1000)} – {formatMs(effect.end * 1000)}
      </button>

      <p className="text-sm text-base-content/60 mt-1">
        {details}
      </p>

      <div className="flex items-center gap-2 mt-3">
        <button type="button" onClick={handleToggle} disabled={!canEdit || busy || needsRecreation} className="btn btn-outline btn-xs">
          <Power className="h-3.5 w-3.5" />
          {effect.enabled ? "Disable" : "Enable"}
        </button>
        <button type="button" onClick={handleDelete} disabled={!canEdit || busy} className="btn btn-ghost btn-xs text-error">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      {!canEdit && <p className="text-xs text-base-content/50 mt-2">Only the creator or host can change this effect.</p>}
      {error && <p role="alert" className="text-error text-sm mt-2">{error}</p>}
    </div>
  );
};
