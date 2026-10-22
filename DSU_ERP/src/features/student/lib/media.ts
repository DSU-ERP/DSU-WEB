export type InterviewMedia = {
  camera: MediaStream | null;
  screen: MediaStream | null;
  displayChecked?: boolean;
  displays?: EventTarget & { screens: readonly unknown[] };
};
const pending = new Map<
  string,
  { media: InterviewMedia; timer: ReturnType<typeof setTimeout> }
>();
export function hasLiveInterviewMedia(media: InterviewMedia | null) {
  return (
    !!media?.camera
      ?.getVideoTracks()
      .some((track) => track.readyState === "live" && track.enabled && !track.muted) &&
    !!media.camera
      .getAudioTracks()
      .some((track) => track.readyState === "live" && track.enabled && !track.muted) &&
    !!media.screen
      ?.getVideoTracks()
      .some((track) => track.readyState === "live")
  );
}
export function stopMedia(media: InterviewMedia) {
  for (const stream of [media.camera, media.screen])
    stream?.getTracks().forEach((track) => track.stop());
}
export function depositMedia(id: string, media: InterviewMedia) {
  const timer = setTimeout(() => {
    const entry = pending.get(id);
    if (entry) stopMedia(entry.media);
    pending.delete(id);
  }, 60000);
  pending.set(id, { media, timer });
}
export function takeMedia(id: string): InterviewMedia | null {
  const entry = pending.get(id);
  if (!entry) return null;
  clearTimeout(entry.timer);
  pending.delete(id);
  return entry.media;
}
