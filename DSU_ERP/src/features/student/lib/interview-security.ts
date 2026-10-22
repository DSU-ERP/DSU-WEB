import type { InterviewMedia } from "./media";
import { hasLiveInterviewMedia } from "./media";

export type SecurityIssue = { kind: string; message: string };
export type SecuritySnapshot = {
  fullscreen: boolean; visible: boolean; focused: boolean;
  mediaReady: boolean; entireScreen: boolean; displayChecked: boolean;
  displayCount: number | null; extended: boolean;
  width: number; height: number; pixelRatio: number;
  captureWidth: number; captureHeight: number; pictureInPicture: boolean;
};
export function interviewSecurityIssues(s: SecuritySnapshot): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  if (!s.fullscreen) issues.push({ kind: "fullscreen-exit", message: "Return to fullscreen to continue." });
  if (!s.visible) issues.push({ kind: "tab-hidden", message: "Keep the interview tab open and visible." });
  else if (!s.focused) issues.push({ kind: "focus-lost", message: "Return focus to the interview window." });
  if (!s.mediaReady) issues.push({ kind: "media-stopped", message: "Restore your camera, microphone and screen sharing." });
  if (!s.entireScreen) issues.push({ kind: "screen-stopped", message: "Share your entire screen, not a window or tab." });
  if (!s.displayChecked) issues.push({ kind: "display-check", message: "Complete the single-display check." });
  if (s.extended || (s.displayCount !== null && s.displayCount !== 1)) issues.push({ kind: "extended-display", message: "Disconnect additional displays before continuing." });
  // Capture dimensions and the viewport are converted to the same physical
  // pixel scale, so ordinary browser zoom does not look like split-screen.
  // This detects reduced coverage, not other apps, overlays or hidden devices.
  if (s.fullscreen && s.entireScreen && s.captureWidth > 0 && s.captureHeight > 0 &&
      (s.width * s.pixelRatio < s.captureWidth * .88 || s.height * s.pixelRatio < s.captureHeight * .88))
    issues.push({ kind: "restricted-window", message: "Use the full screen. Close split-screen, side panels or docked tools, then restore fullscreen." });
  if (s.pictureInPicture) issues.push({ kind: "picture-in-picture", message: "Close picture-in-picture before continuing." });
  return issues;
}
export function readInterviewSecurity(media: InterviewMedia | null): SecurityIssue[] {
  const settings = media?.screen?.getVideoTracks()[0]?.getSettings();
  return interviewSecurityIssues({
    fullscreen: !!document.fullscreenElement, visible: !document.hidden, focused: document.hasFocus(),
    mediaReady: hasLiveInterviewMedia(media), entireScreen: settings?.displaySurface === "monitor",
    displayChecked: media?.displayChecked === true, displayCount: media?.displays?.screens.length ?? null,
    extended: (window.screen as Screen & { isExtended?: boolean }).isExtended === true,
    width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio || 1,
    captureWidth: settings?.width || 0, captureHeight: settings?.height || 0,
    pictureInPicture: !!document.pictureInPictureElement,
  });
}
export function restrictedInterviewKey(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) {
  const key = e.key.toLowerCase(), command = e.ctrlKey || e.metaKey;
  if (command && ["c", "x", "v"].includes(key) || key === "insert" && (e.ctrlKey || e.shiftKey)) return "clipboard";
  if (command && ["t", "n", "w", "l", "r", "tab", "pageup", "pagedown"].includes(key) ||
      e.altKey && ["arrowleft", "arrowright"].includes(key) || key === "f5") return "navigation-attempt";
  return null;
}
