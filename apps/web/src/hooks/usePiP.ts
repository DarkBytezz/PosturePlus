// usePiP.ts
//
// Picture-in-Picture using canvas.captureStream() — not the raw video.
// This means the PiP window shows MediaPipe keypoints + PSI overlay.
//
// Key design rules:
//   1. primeVideo() MUST be called inside a user gesture (calibrate click).
//      It sets up captureStream, calls video.play(), then immediately does
//      requestPictureInPicture() → exitPictureInPicture(). This one cycle
//      permanently trusts the video element — identical to the Google Meet
//      trick. After this, visibilitychange can trigger PiP freely forever
//      without needing another user gesture.
//
//   2. enterPiP() just calls requestPictureInPicture() on the trusted element.
//      It NEVER creates a new stream or calls play() again — doing so resets
//      the gesture permission and blocks PiP.
//
//   3. blur and visibilitychange both fire when switching apps. We deduplicate
//      with a guard flag so enterPiP is only called once per switch.

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export function usePiP(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [isPiP,     setIsPiP]     = useState(false);
  const [supported, setSupported] = useState(false);

  const autoModeRef  = useRef(false);
  const primedRef    = useRef(false);          // true after primeVideo() succeeds
  const enteringRef  = useRef(false);          // dedup guard — prevents double-enter
  const pipVideoRef  = useRef<HTMLVideoElement | null>(null);
  const isPiPRef          = useRef(false);
  const lastInteractionRef = useRef(0);       // timestamp of last user interaction

  useEffect(() => {
    setSupported(document.pictureInPictureEnabled ?? false);

    const v = document.createElement("video");
    v.muted    = true;
    v.autoplay = true;
    v.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(v);            // must be in DOM for Chrome PiP
    pipVideoRef.current = v;

    const onEnter = () => { setIsPiP(true);  isPiPRef.current = true;  enteringRef.current = false; };
    const onLeave = () => { setIsPiP(false); isPiPRef.current = false; enteringRef.current = false; };
    v.addEventListener("enterpictureinpicture", onEnter);
    v.addEventListener("leavepictureinpicture", onLeave);

    return () => {
      v.removeEventListener("enterpictureinpicture", onEnter);
      v.removeEventListener("leavepictureinpicture", onLeave);
      document.body.removeChild(v);
    };
  }, []);

  // ── Interaction tracker — keeps lastInteractionRef fresh ─────────────────
  // Chrome requires a recent user activation for requestPictureInPicture().
  // We track mouse/key/scroll events so enterPiP() can check the window.
  useEffect(() => {
    const mark = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener("mousedown", mark);
    window.addEventListener("keydown",   mark);
    window.addEventListener("mousemove", mark);
    window.addEventListener("scroll",    mark, { passive: true });
    return () => {
      window.removeEventListener("mousedown", mark);
      window.removeEventListener("keydown",   mark);
      window.removeEventListener("mousemove", mark);
      window.removeEventListener("scroll",    mark);
    };
  }, []);

  // ── Prime — call ONCE inside a user gesture (calibrate button click) ──────
  // The Meet trick: stream → play → requestPiP → exitPiP, all in one gesture.
  // That single enter+exit cycle permanently grants Chrome trust for this
  // element. After this, visibilitychange can trigger PiP freely forever
  // without needing another user gesture. Also enables auto-mode immediately.
  const primeVideo = useCallback(async () => {
    if (primedRef.current) return;           // only prime once
    const canvas = canvasRef.current;
    const video  = pipVideoRef.current;
    if (!canvas || !video || !document.pictureInPictureEnabled) return;
    try {
      // Step 1 — attach stream and play (must happen before requestPiP)
      video.srcObject = canvas.captureStream(12);
      await video.play();
      console.log("[PiP] stream ready ✓");

      // Step 2 — enter PiP immediately (still inside the user gesture)
      await video.requestPictureInPicture();
      console.log("[PiP] trust established ✓");

      // Step 3 — exit immediately (stay in same activation frame — no setTimeout)
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      // Step 4 — mark primed and enable auto-mode in one shot
      primedRef.current   = true;
      autoModeRef.current = true;
      console.log("[PiP] primed + auto-mode ON ✓");
    } catch (e) {
      console.warn("[PiP] primeVideo failed:", e);
    }
  }, [canvasRef]);

  // ── Enter PiP — ONLY calls requestPictureInPicture, never touches srcObject ─
  const enterPiP = useCallback(async () => {
    if (!primedRef.current)                  return;  // not primed yet
    if (!autoModeRef.current)                return;  // auto-mode off
    if (enteringRef.current)                 return;  // already entering
    if (isPiPRef.current)                    return;  // already in PiP
    if (!document.pictureInPictureEnabled)   return;
    if (document.pictureInPictureElement)    return;

    const video = pipVideoRef.current;
    if (!video) return;
    if (video.readyState < 2) return;        // stream not ready — don't attempt

    // Chrome requires recent user activation — same rule Google Meet follows.
    // 5 second window: if user hasn't interacted recently, PiP will be blocked.
    const timeSinceInteraction = Date.now() - lastInteractionRef.current;
    if (timeSinceInteraction > 5000) {
      console.log(`[PiP] blocked — no interaction for ${Math.round(timeSinceInteraction / 1000)}s`);
      return;
    }

    enteringRef.current = true;
    try {
      await video.requestPictureInPicture();
    } catch (e) {
      console.warn("[PiP] enter failed:", e);
      enteringRef.current = false;
    }
  }, []);

  // ── Exit PiP ──────────────────────────────────────────────────────────────
  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) return;
    try {
      await document.exitPictureInPicture();
    } catch (e) {
      console.warn("[PiP] exit failed:", e);
    }
  }, []);

  // ── Auto-mode ─────────────────────────────────────────────────────────────
  const enableAutoMode  = useCallback(() => { autoModeRef.current = true;  }, []);
  const disableAutoMode = useCallback(() => { autoModeRef.current = false; }, []);

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    // visibilitychange is the most reliable cross-platform trigger.
    // blur fires faster on Windows but also fires when switching Chrome windows.
    // We use visibilitychange as primary, blur as secondary with a guard.
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const onVisibility = () => {
      if (!autoModeRef.current) return;
      if (document.visibilityState === "hidden") {
        // Cancel any pending blur-triggered enter (dedup)
        if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
        enterPiP();
      } else {
        setTimeout(() => exitPiP(), 400);
      }
    };

    const onBlur = () => {
      if (!autoModeRef.current) return;
      // 800ms delay — prevents flicker on quick tab switches.
      // visibilitychange fires first and cancels this if the tab actually hides.
      blurTimer = setTimeout(() => { enterPiP(); blurTimer = null; }, 800);
    };

    const onPageHide = () => {
      if (!autoModeRef.current) return;
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      enterPiP();
    };

    const onFocus = () => {
      if (!autoModeRef.current) return;
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      setTimeout(() => exitPiP(), 400);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur",     onBlur);
    window.addEventListener("focus",    onFocus);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur",     onBlur);
      window.removeEventListener("focus",    onFocus);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enterPiP, exitPiP]);

  // ── Document title ────────────────────────────────────────────────────────
  useEffect(() => {
    const original = document.title;
    if (isPiP) document.title = "Posture+ 📐 Live";
    return () => { document.title = original; };
  }, [isPiP]);

  return {
    isPiP,
    isPiPRef,
    primeVideo,
    enterPiP,
    exitPiP,
    supported,
    enableAutoMode,
    disableAutoMode,
  };
}