// usePopupBroadcast.ts
// Opens the live popup window and broadcasts posture data to it via BroadcastChannel.
// The popup runs in its own browser context — never throttled by tab visibility.

import { useEffect, useRef, useCallback } from "react";

export type PopupPayload = {
  psi:            number;
  zone:           "GREEN" | "YELLOW" | "RED";
  forward_dev:    number;
  lateral_dev:    number;
  shoulder_dev:   number;
  isCalibrated:   boolean;
  duration:       string;
  alertFired:     boolean;
  alertEscalated: boolean;
  insight?:       { icon: string; text: string };
};

const CHANNEL_NAME = "postureplus-live";
const POPUP_URL    = "/popup.html";
const POPUP_OPTS   = "width=320,height=460,resizable=no,scrollbars=no,toolbar=no,menubar=no,location=no,status=no";

export function usePopupBroadcast() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const popupRef   = useRef<Window | null>(null);

  // Lazy-init channel
  const getChannel = useCallback((): BroadcastChannel => {
    if (!channelRef.current || channelRef.current.name !== CHANNEL_NAME) {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    }
    return channelRef.current;
  }, []);

  // Open (or focus) popup
  const openPopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    popupRef.current = window.open(POPUP_URL, "postureplus-popup", POPUP_OPTS);
  }, []);

  // Broadcast live frame data
  const broadcast = useCallback((payload: PopupPayload) => {
    // Only bother if popup is open
    if (!popupRef.current || popupRef.current.closed) return;
    getChannel().postMessage({ type: "LIVE_DATA", payload });
  }, [getChannel]);

  // Notify popup session ended
  const broadcastSessionEnd = useCallback(() => {
    getChannel().postMessage({ type: "SESSION_ENDED" });
  }, [getChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelRef.current?.close();
    };
  }, []);

  return { openPopup, broadcast, broadcastSessionEnd };
}