// Browser fixture only. No physical camera/microphone/display is accessed.
function installInterviewSecurity({ ready = true } = {}) {
  const state = window.__interviewSecurity = { fullscreen: ready, visible: true, focused: true, extended: false, coverage: 1, surface: 'monitor', denyCamera: false, denyDisplay: false };
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => state.fullscreen ? document.documentElement : null });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => !state.visible });
  document.hasFocus = () => state.focused;
  Object.defineProperty(window.screen, 'isExtended', { configurable: true, get: () => state.extended });
  const displays = new EventTarget(); Object.defineProperty(displays, 'screens', { get: () => state.extended ? [{}, {}] : [{}] });
  window.getScreenDetails = async () => { if (state.denyDisplay) throw Error('Synthetic denied permission'); return displays; };
  document.documentElement.requestFullscreen = async () => { state.fullscreen = true; document.dispatchEvent(new Event('fullscreenchange')); };
  document.exitFullscreen = async () => { state.fullscreen = false; document.dispatchEvent(new Event('fullscreenchange')); };
  const makeStream = screen => {
    const canvas = document.createElement('canvas');canvas.width=320;canvas.height=180;
    canvas.getContext('2d').fillRect(0,0,320,180);
    const stream = canvas.captureStream(1), video = stream.getVideoTracks()[0];
    video.getSettings = () => ({ displaySurface: screen ? state.surface : undefined, width: innerWidth * devicePixelRatio / state.coverage, height: innerHeight * devicePixelRatio });
    if (!screen) {
      const audio = new EventTarget();Object.assign(audio,{kind:'audio',readyState:'live',enabled:true,muted:false,stop(){this.readyState='ended';}});
      const original = stream.getTracks.bind(stream);
      stream.getAudioTracks = () => [audio];stream.getTracks = () => [...original(),audio];
    }
    return stream;
  };
  window.__makeInterviewMedia = () => {
    const media={camera:makeStream(false),screen:makeStream(true),displayChecked:true,displays};state.media=media;return media;
  };
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{if(state.denyCamera)throw Error('Synthetic denied permission');return makeStream(false);},getDisplayMedia:async()=>makeStream(true)}});
}
module.exports = { installInterviewSecurity };
