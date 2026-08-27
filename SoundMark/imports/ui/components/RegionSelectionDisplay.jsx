import { formatTime } from "../utils/time";

export const RegionSelectionDisplay = ({activeRegion}) => {
    if (!activeRegion) return null;

    const duration = activeRegion.end - activeRegion.start;

    return (
        <div className="flex items-center gap-3 text-sm text-base-content/70 px-6">
            <span>
                Selection: {formatTime(activeRegion.start)} - {formatTime(activeRegion.end)}
            </span>
            <span className="text-base-content/40">
                ({formatTime(duration)})
            </span>
        </div>
    )
}