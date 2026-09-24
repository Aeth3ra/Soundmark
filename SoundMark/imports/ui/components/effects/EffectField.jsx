/**
 * Renders one form field from an EFFECT_TYPES field descriptor. Handles the
 * three field kinds the effects form needs (number, range+number, select) so
 * EffectForm never has to hand-roll markup per effect type.
 */
export const EffectField = ({ field, value, onChange, disabled }) => {
	const id = `effect-${field.name}`;
	const helpId = field.help ? `${id}-help` : undefined;

	if (field.kind === "select") {
		return (
			<div className="flex flex-col gap-2">
				<label htmlFor={id} className="text-sm font-medium">
					{field.label}
				</label>
				<select
					id={id}
					value={value}
					disabled={disabled}
					onChange={(event) =>
						onChange(field.name, event.target.value)
					}
					className="select select-bordered w-full"
				>
					{field.options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		);
	}

	if (field.kind === "range") {
		return (
			<div className="flex flex-col gap-3">
				<label htmlFor={id} className="text-sm font-medium">
					{field.label}
				</label>

				<div className="flex items-center gap-3">
					<input
						id={id}
						type="range"
						min={field.min}
						max={field.max}
						step={field.step}
						value={value}
						disabled={disabled}
						onChange={(event) =>
							onChange(field.name, event.target.value)
						}
						className="range range-primary flex-1"
					/>
					<input
						type="number"
						min={field.min}
						max={field.max}
						step={field.step}
						value={value}
						disabled={disabled}
						onChange={(event) =>
							onChange(field.name, event.target.value)
						}
						aria-label={field.label}
						className="input input-bordered w-20"
					/>
				</div>

				{field.help && (
					<p className="text-xs text-base-content/60">{field.help}</p>
				)}
			</div>
		);
	}

	// Default: plain numeric input.
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-sm font-medium">
				{field.label}
			</label>
			<input
				id={id}
				type="number"
				min={field.min}
				max={field.max}
				step={field.step ?? "any"}
				required
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(field.name, event.target.value)}
				aria-describedby={helpId}
				className="input input-bordered w-full"
			/>
			{field.help && (
				<p id={helpId} className="text-xs text-base-content/60">
					{field.help}
				</p>
			)}
		</div>
	);
};
