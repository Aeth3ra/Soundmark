import { useState, useEffect, useMemo } from "react";
import { X, Search, ArrowRight, Check } from "lucide-react";
import { TAG_CATEGORIES } from "../../lib/tags";
import { msToSeconds, toText, parseTimeToMs } from "../../utils/time";
import {
	ANNOTATION_COLOURS,
	DEFAULT_ANNOTATION_COLOUR
} from "../../lib/annotationColours";
import {
	createAnnotation,
	updateAnnotation
} from "../../services/annotationService";

/* ------------------------------------------------------------------ *
 * The form
 * ------------------------------------------------------------------ */

export const AnnotationForm = ({ trigger, annotation, fileId, onClose }) => {
	const source = getSource(annotation, trigger);
	const [values, setValues] = useState(() => toFormValues(source));
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	// Reload whenever a different annotation / selection comes in
	useEffect(() => {
		setValues(toFormValues(getSource(annotation, trigger)));
		setError(null);
	}, [annotation, trigger]);

	// Flat guards: hidden, or opened without a region to annotate
	if (trigger === undefined && !annotation) return null;
	if (!annotation && !trigger) return <NoRegion onClose={onClose} />;

	const copy = COPY[annotation ? "edit" : "create"];
	const setField = (name, value) =>
		setValues((prev) => ({ ...prev, [name]: value }));

	const save = (payload) =>
		annotation
			? updateAnnotation(annotation._id, payload)
			: createAnnotation({ fileId, ...payload });

	const submit = async () => {
		const start = readTime(values.startText, source.start);
		const end = readTime(values.endText, source.end);

		const problem = validateRange(start, end);
		if (problem) {
			setError(problem);
			return;
		}

		setError(null);
		setSaving(true);
		try {
			await save({
				title: values.title,
				colour: values.colour,
				tags: values.tags,
				comment: values.comment,
				start,
				end
			});
			onClose();
		} catch {
			setError(copy.failure);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Shell accent={values.colour} label={copy.label}>
			<header className="flex items-start gap-3 px-6 pb-1 pt-5">
				<input
					type="text"
					autoFocus
					aria-label="Title"
					value={values.title}
					onChange={(e) => setField("title", e.target.value)}
					placeholder="Name this annotation"
					style={{ caretColor: values.colour }}
					className="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-base-content/25"
				/>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="btn btn-ghost btn-sm btn-circle -mr-2"
				>
					<X className="h-4 w-4" />
				</button>
			</header>

			<div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-5">
				<Section title="Time">
					<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
						<TimeInput
							label="Start"
							value={values.startText}
							onChange={(v) => setField("startText", v)}
							placeholder="0:00.000"
						/>
						<ArrowRight className="mb-3 h-4 w-4 text-base-content/30" />
						<TimeInput
							label="End (optional)"
							value={values.endText}
							onChange={(v) => setField("endText", v)}
							placeholder="No end"
						/>
					</div>
					<p className="text-xs text-base-content/50">
						{TIME_HINT}. Leave the end blank to mark a single
						moment.
					</p>
				</Section>

				<Section title="Colour">
					<ColourPicker
						value={values.colour}
						onChange={(v) => setField("colour", v)}
					/>
				</Section>

				<Section title="Tags">
					{/* key remounts the picker so its search text resets between annotations */}
					<TagPicker
						key={annotation?._id ?? trigger?.startMs}
						selected={values.tags}
						onChange={(v) => setField("tags", v)}
					/>
				</Section>

				<Section title="Comment">
					<textarea
						value={values.comment}
						onChange={(e) => setField("comment", e.target.value)}
						placeholder="Add a comment (optional)"
						rows={3}
						className={`${INPUT} resize-none`}
					/>
				</Section>

				{error && (
					<p
						role="alert"
						className="rounded-lg bg-error/10 px-3.5 py-2.5 text-sm text-error"
					>
						{error}
					</p>
				)}
			</div>

			<footer className="flex items-center justify-end gap-2 border-t border-base-300 bg-base-200/40 px-6 py-4">
				<button
					type="button"
					onClick={onClose}
					className="btn btn-ghost"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={submit}
					disabled={saving}
					className="btn btn-primary min-w-36"
				>
					{saving && (
						<span className="loading loading-spinner loading-sm" />
					)}
					{copy.submit}
				</button>
			</footer>
		</Shell>
	);
};

// Styling
const COPY = {
	create: {
		label: "New annotation",
		submit: "Save annotation",
		failure:
			"Couldn't save the annotation. Check your connection and try again."
	},
	edit: {
		label: "Edit annotation",
		submit: "Save changes",
		failure:
			"Couldn't save your changes. Check your connection and try again."
	}
};

const TIME_HINT = "Use m:ss or m:ss.mmm";

const INPUT =
	"w-full rounded-lg bg-base-200/60 px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-base-300 transition placeholder:text-base-content/30 focus:bg-base-100 focus:ring-2 focus:ring-primary";

// text -> seconds, null (blank) or NaN (invalid).
// A field the user left alone keeps its exact stored value, so formatMs
// rounding can never alter a timestamp.
const readTime = (text, original) => {
	if (text === toText(original)) return original;
	if (!text.trim()) return null;
	const ms = parseTimeToMs(text);
	return ms == null ? NaN : ms / 1000;
};

const validateRange = (start, end) => {
	if (!Number.isFinite(start)) return `Start time isn't valid. ${TIME_HINT}.`;
	if (Number.isNaN(end))
		return `End time isn't valid. ${TIME_HINT}, or leave it blank.`;
	if (end !== null && end <= start)
		return "End time must be after the start time.";
	return null;
};

// Form Values
const BLANK = {
	title: "",
	tags: [],
	colour: DEFAULT_ANNOTATION_COLOUR,
	comment: "",
	start: null,
	end: null
};

// An existing annotation, a fresh selection, or blank
const getSource = (annotation, trigger) => {
	if (annotation) {
		return {
			title: annotation.title ?? "",
			tags: annotation.tags ?? [],
			colour: annotation.colour ?? DEFAULT_ANNOTATION_COLOUR,
			comment: annotation.comment ?? "",
			start: annotation.start,
			end: annotation.end ?? null
		};
	}
	if (trigger) {
		return {
			...BLANK,
			start: trigger.startMs / 1000,
			end: msToSeconds(trigger.endMs)
		};
	}
	return BLANK;
};

const toFormValues = ({ start, end, ...details }) => ({
	...details,
	startText: toText(start),
	endText: toText(end)
});

// -- COMPONENENTS --

const Shell = ({ accent, label, children }) => (
	<div className="fixed inset-0 z-50 grid place-items-center bg-base-content/25 p-4 backdrop-blur-[2px]">
		<div
			role="dialog"
			aria-modal="true"
			aria-label={label}
			className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-base-100 shadow-2xl ring-1 ring-base-content/10"
		>
			{/* The annotation's own colour, so you can see what you're making */}
			<div
				className="h-1.5 shrink-0 transition-colors"
				style={{ backgroundColor: accent }}
			/>
			{children}
		</div>
	</div>
);

const Section = ({ title, children }) => (
	<section className="flex flex-col gap-2.5">
		<h3 className="text-sm font-medium text-base-content/70">{title}</h3>
		{children}
	</section>
);

const TimeInput = ({ label, value, onChange, placeholder }) => (
	<label className="flex flex-col gap-1.5">
		<span className="text-xs text-base-content/50">{label}</span>
		<input
			type="text"
			inputMode="decimal"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className={`${INPUT} font-mono tabular-nums`}
		/>
	</label>
);

const ColourPicker = ({ value, onChange }) => (
	<div className="flex flex-wrap gap-2.5">
		{ANNOTATION_COLOURS.map((c) => (
			<button
				key={c.value}
				type="button"
				title={c.name}
				aria-label={c.name}
				aria-pressed={value === c.value}
				onClick={() => onChange(c.value)}
				style={{ backgroundColor: c.value }}
				className="group grid h-8 w-8 place-items-center rounded-full transition hover:scale-110 aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-base-content/70 aria-pressed:ring-offset-2 aria-pressed:ring-offset-base-100"
			>
				<Check className="h-4 w-4 text-white opacity-0 drop-shadow group-aria-pressed:opacity-100" />
			</button>
		))}
	</div>
);

// Selected state is styled from aria-pressed, so there's no class juggling
const TagChip = ({ selected, onClick, children }) => (
	<button
		type="button"
		aria-pressed={selected}
		onClick={onClick}
		className="inline-flex items-center gap-1 rounded-full bg-base-100 px-3 py-1 text-xs font-medium text-base-content/70 ring-1 ring-inset ring-base-300 transition hover:ring-primary/50 aria-pressed:bg-primary aria-pressed:text-primary-content aria-pressed:ring-primary"
	>
		{children}
	</button>
);

// Search filters the categories rather than swapping to a separate view,
// and the same box adds a custom tag (Enter or "Add").
const TagPicker = ({ selected, onChange }) => {
	const [query, setQuery] = useState("");
	const q = query.trim().toLowerCase();

	const groups = useMemo(
		() =>
			Object.entries(TAG_CATEGORIES)
				.map(([category, tags]) => [
					category,
					tags.filter((tag) => tag.toLowerCase().includes(q))
				])
				.filter(([, tags]) => tags.length > 0),
		[q]
	);

	const toggle = (tag) =>
		onChange(
			selected.includes(tag)
				? selected.filter((t) => t !== tag)
				: [...selected, tag]
		);

	const addQuery = () => {
		const tag = query.trim();
		if (tag && !selected.includes(tag)) onChange([...selected, tag]);
		setQuery("");
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) =>
						e.key === "Enter" && (e.preventDefault(), addQuery())
					}
					placeholder="Search tags, or type a new one"
					className={`${INPUT} pl-9 pr-16`}
				/>
				<button
					type="button"
					onClick={addQuery}
					disabled={!query.trim()}
					className="btn btn-ghost btn-xs absolute right-1.5 top-1/2 -translate-y-1/2"
				>
					Add
				</button>
			</div>

			{/* Chosen tags (includes custom ones); hides itself when empty */}
			<div className="flex flex-wrap gap-1.5 empty:hidden">
				{selected.map((tag) => (
					<TagChip key={tag} selected onClick={() => toggle(tag)}>
						{tag}
						<X className="h-3 w-3" />
					</TagChip>
				))}
			</div>

			<div className="flex max-h-44 flex-col gap-3 overflow-y-auto rounded-lg p-3 ring-1 ring-inset ring-base-300">
				{groups.map(([category, tags]) => (
					<div key={category}>
						<p className="mb-1.5 text-xs text-base-content/50">
							{category}
						</p>
						<div className="flex flex-wrap gap-1.5">
							{tags.map((tag) => (
								<TagChip
									key={tag}
									selected={selected.includes(tag)}
									onClick={() => toggle(tag)}
								>
									{tag}
								</TagChip>
							))}
						</div>
					</div>
				))}
				{/* Only visible when it's the sole child, i.e. nothing matched */}
				<p className="hidden text-sm text-base-content/50 only:block">
					No tags match. Press Enter to add it as a new tag.
				</p>
			</div>
		</div>
	);
};

const NoRegion = ({ onClose }) => (
	<Shell accent={DEFAULT_ANNOTATION_COLOUR} label="No region selected">
		<div className="flex flex-col gap-5 p-6">
			<div>
				<h2 className="text-lg font-semibold">No region selected</h2>
				<p className="mt-1 text-sm text-base-content/60">
					Drag across the waveform to select the part you want to
					annotate, then try again.
				</p>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="btn btn-primary self-end"
			>
				Got it
			</button>
		</div>
	</Shell>
);
