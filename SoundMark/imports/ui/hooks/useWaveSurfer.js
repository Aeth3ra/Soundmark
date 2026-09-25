import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { loadAudioBuffer, createPreviewBlob } from "../services/audioService";
const defaultServices = { loadAudioBuffer, createPreviewBlob };
const initialPlayer = () => ({
	isPlaying: false,
	isLooping: false,
	playbackRate: 1,
	currentTime: 0,
	duration: 0,
	zoom: 0,
	wavesurferInstance: null,
	isProcessing: false,
	audioError: null,
	audioVersion: 0
});

// Also stop waiting if a media error occurs or this player is disposed
async function loadPreview(wavesurfer, blob, signal) {
	let unsubscribe;
	let onAbort;
	const interrupted = new Promise((_, reject) => {
		unsubscribe = wavesurfer.once("error", reject);
		onAbort = () =>
			reject(new DOMException("Preview cancelled.", "AbortError"));
		signal.addEventListener("abort", onAbort, { once: true });
	});
	try {
		if (signal.aborted)
			throw new DOMException("Preview cancelled.", "AbortError");
		await Promise.race([wavesurfer.loadBlob(blob), interrupted]);
	} finally {
		unsubscribe();
		signal.removeEventListener("abort", onAbort);
	}
}

export const useWavesurfer = (
	url,
	effects = [],
	effectsReady = true,
	services = defaultServices
) => {
	const containerRef = useRef(null);
	const sessionRef = useRef(null);
	const servicesRef = useRef(services);
	servicesRef.current = services;
	const [player, setPlayer] = useState(initialPlayer);
	const [retry, setRetry] = useState(0);
	// React renders during playback; only changed effect data starts a new render
	const effectsKey = JSON.stringify(effects);
	const updatePlayer = useCallback((patch) => {
		setPlayer((current) => ({ ...current, ...patch }));
	}, []);

	const startPlayback = useCallback(
		async (session) => {
			if (session.closed || session.updating || !session.ready) return;
			const version = session.version;
			try {
				await session.wavesurfer.play();
			} catch (error) {
				if (session.closed || session.version !== version) return;
				session.wantPlay = false;
				updatePlayer({
					isPlaying: false,
					audioError:
						"Could not start playback: " +
						error.message +
						". Press Play to try again."
				});
			}
		},
		[updatePlayer]
	);

	// One WaveSurfer instance for each source URL, shared by all effect previews
	useEffect(() => {
		setPlayer(initialPlayer());
		if (!url || !containerRef.current) return;

		const wavesurfer = WaveSurfer.create({
			container: containerRef.current,
			waveColor: "rgb(200, 0, 200)",
			progressColor: "rgb(100, 0, 100)",
			cursorColor: "#ff2d55",
			cursorWidth: 1
		});
		const session = {
			url,
			wavesurfer,
			controller: new AbortController(),
			closed: false,
			updating: true,
			ready: false,
			failed: false,
			version: 0,
			audioVersion: 0,
			appliedKey: null,
			sourcePromise: null,
			queue: Promise.resolve(),
			position: 0,
			duration: 0,
			wantPlay: false,
			volume: 1,
			rate: 1,
			loop: false,
			zoom: 0
		};
		sessionRef.current = session;

		wavesurfer.on("timeupdate", () => {
			if (session.closed || session.updating || !session.ready) return;
			session.position = wavesurfer.getCurrentTime();
			updatePlayer({ currentTime: session.position });
		});
		wavesurfer.on("play", () => {
			if (session.closed) return;
			if (session.updating || !session.ready) {
				wavesurfer.pause();
				return;
			}
			session.wantPlay = true;
			updatePlayer({ isPlaying: true });
		});
		const stopped = () => {
			if (session.closed || session.updating) return;
			session.wantPlay = false;
			updatePlayer({ isPlaying: false });
		};
		wavesurfer.on("pause", stopped);
		wavesurfer.on("finish", stopped);
		wavesurfer.on("zoom", (value) => {
			if (session.closed) return;
			session.zoom = value;
			updatePlayer({ zoom: value });
		});
		wavesurfer.on("error", (error) => {
			// Errors while loading are handled by the current preview request
			if (session.closed || session.updating) return;
			session.failed = true;
			session.ready = false;
			session.wantPlay = false;
			wavesurfer.pause();
			updatePlayer({ isPlaying: false, audioError: error.message });
		});

		return () => {
			session.closed = true;
			session.version++;
			session.controller.abort();
			session.sourcePromise = null;
			wavesurfer.destroy(); // Also releases the Blob URL owned by WaveSurfer
			if (sessionRef.current === session) sessionRef.current = null;
		};
	}, [url, updatePlayer]);

	useEffect(() => {
		const session = sessionRef.current;
		if (!session || session.url !== url) return;
		const version = ++session.version;
		const isCurrent = () => !session.closed && session.version === version;

		if (session.ready)
			session.position = session.wavesurfer.getCurrentTime();
		session.updating = true;
		session.ready = false;
		session.failed = false;
		session.wavesurfer.pause(); // Keep wantPlay and position for restoration
		session.wavesurfer.toggleInteraction(false);
		updatePlayer({
			isProcessing: true,
			isPlaying: false,
			audioError: null
		});

		if (effectsReady) {
			const audio = servicesRef.current;
			const snapshot = JSON.parse(effectsKey);
			session.queue = session.queue.then(async () => {
				if (!isCurrent()) return;
				try {
					if (!session.sourcePromise) {
						session.sourcePromise = audio
							.loadAudioBuffer(url, session.controller.signal)
							.catch((error) => {
								session.sourcePromise = null;
								throw error;
							});
					}
					const original = await session.sourcePromise;
					if (!isCurrent()) return;
					session.duration = original.duration;
					const blob = await audio.createPreviewBlob(
						original,
						snapshot
					);
					if (!isCurrent()) return;
					await loadPreview(
						session.wavesurfer,
						blob,
						session.controller.signal
					);
					if (!isCurrent()) return;

					const wavesurfer = session.wavesurfer;
					session.position = Math.min(
						session.position,
						wavesurfer.getDuration()
					);
					wavesurfer.setTime(session.position);
					wavesurfer.setVolume(session.volume);
					wavesurfer.setPlaybackRate(session.rate, true);
					wavesurfer.getMediaElement().loop = session.loop;
					wavesurfer.zoom(session.zoom);
					wavesurfer.toggleInteraction(true);
					session.appliedKey = effectsKey;
					session.audioVersion++;
					session.updating = false;
					session.ready = true;
					updatePlayer({
						wavesurferInstance: wavesurfer,
						duration: wavesurfer.getDuration(),
						currentTime: session.position,
						isProcessing: false,
						audioVersion: session.audioVersion
					});
					if (session.wantPlay) void startPlayback(session);
				} catch (error) {
					if (!isCurrent()) return;
					session.updating = false;
					session.ready = false;
					session.failed = true;
					session.wantPlay = false;
					updatePlayer({
						isProcessing: false,
						isPlaying: false,
						audioError:
							error.reason ||
							error.message ||
							"Could not prepare audio."
					});
				}
			});
		}

		return () => {
			session.version++;
		};
	}, [url, effectsKey, effectsReady, retry, updatePlayer, startPlayback]);

	const play = useCallback(() => {
		const session = sessionRef.current;
		if (!session || session.closed || session.failed) return;
		session.wantPlay = true;
		updatePlayer({ audioError: null });
		return startPlayback(session);
	}, [startPlayback, updatePlayer]);
	const pause = useCallback(() => {
		const session = sessionRef.current;
		if (!session) return;
		session.wantPlay = false;
		session.wavesurfer.pause();
		updatePlayer({ isPlaying: false });
	}, [updatePlayer]);
	const playPause = useCallback(() => {
		return sessionRef.current?.wantPlay ? pause() : play();
	}, [play, pause]);
	const seekTo = useCallback(
		(ratio) => {
			const session = sessionRef.current;
			if (!session || !Number.isFinite(ratio)) return;
			session.position =
				Math.max(0, Math.min(1, ratio)) * session.duration;
			if (session.ready) session.wavesurfer.setTime(session.position);
			updatePlayer({ currentTime: session.position });
		},
		[updatePlayer]
	);
	const setVolume = useCallback((value) => {
		const session = sessionRef.current;
		if (!session || !Number.isFinite(value)) return;
		session.volume = Math.max(0, Math.min(1, value));
		session.wavesurfer.setVolume(session.volume);
	}, []);
	const setPlaybackRate = useCallback(
		(rate) => {
			const session = sessionRef.current;
			if (!session || !Number.isFinite(rate) || rate <= 0) return;
			session.rate = rate;
			session.wavesurfer.setPlaybackRate(rate, true);
			updatePlayer({ playbackRate: rate });
		},
		[updatePlayer]
	);
	const setZoom = useCallback(
		(value) => {
			const session = sessionRef.current;
			if (!session || !Number.isFinite(value) || value < 0) return;
			session.zoom = value;
			if (session.ready) session.wavesurfer.zoom(value);
			updatePlayer({ zoom: value });
		},
		[updatePlayer]
	);
	const toggleLoop = useCallback(() => {
		const session = sessionRef.current;
		if (!session) return;
		session.loop = !session.loop;
		session.wavesurfer.getMediaElement().loop = session.loop;
		updatePlayer({ isLooping: session.loop });
	}, [updatePlayer]);
	const retryAudio = useCallback(() => setRetry((value) => value + 1), []);
	const session = sessionRef.current;
	const isAudioReady = Boolean(
		session?.url === url &&
		session?.ready &&
		session.appliedKey === effectsKey &&
		effectsReady
	);

	return {
		...player,
		containerRef,
		isAudioReady,
		retryAudio,
		play,
		pause,
		playPause,
		seekTo,
		setVolume,
		setZoom,
		setPlaybackRate,
		toggleLoop
	};
};
