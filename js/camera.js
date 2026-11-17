// Camera access wrapper: start/stop, front/back flip (or cycle webcams on
// desktop), and frame capture to a canvas.

export class CameraError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'insecure' | 'denied' | 'none' | 'busy' | 'unknown'
  }
}

function mapError(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new CameraError('denied', 'Camera access is blocked.');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraError('none', 'No camera found on this device.');
    case 'NotReadableError':
    case 'TrackStartError':
      return new CameraError('busy', 'The camera is in use by another app.');
    default:
      return new CameraError('unknown', (err && err.message) || 'The camera could not start.');
  }
}

export class Camera {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.facing = 'user';
    this.deviceId = null;
    this.cameraCount = 0;
    this.onEnded = null;
  }

  get active() {
    return !!this.stream && this.video.readyState >= 2 && this.video.videoWidth > 0;
  }

  // Selfie view is mirrored in the preview only for front-facing cameras.
  get mirrored() {
    return this.facing === 'user';
  }

  async start({ facing = this.facing, deviceId = null, exact = false } = {}) {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new CameraError(
        'insecure',
        'The camera needs a secure (https) connection. Open the site with https or on localhost.'
      );
    }
    this.stop();

    const size = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    const attempts = [];
    if (deviceId) {
      attempts.push({ video: { deviceId: { exact: deviceId }, ...size }, audio: false });
    } else {
      attempts.push({
        video: { facingMode: exact ? { exact: facing } : { ideal: facing }, ...size },
        audio: false
      });
    }
    attempts.push({ video: { facingMode: { ideal: facing } }, audio: false });
    attempts.push({ video: true, audio: false });

    let stream = null;
    let lastErr = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastErr = err;
        // Permission problems will not be fixed by relaxing constraints.
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) break;
        if (exact && err && err.name === 'OverconstrainedError') break;
      }
    }
    if (!stream) throw mapError(lastErr);

    this.stream = stream;
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings ? track.getSettings() : {};
    this.deviceId = settings.deviceId || deviceId || null;
    this.facing = settings.facingMode || facing;
    this.hasFacingMode = !!settings.facingMode;
    track.addEventListener('ended', () => {
      if (this.stream === stream && this.onEnded) this.onEnded();
    });

    this.video.srcObject = stream;
    await new Promise((resolve) => {
      if (this.video.readyState >= 1) return resolve();
      this.video.onloadedmetadata = () => resolve();
    });
    try {
      await this.video.play();
    } catch {
      /* autoplay can reject until a gesture; the stream is still attached */
    }
    await this.refreshCount();
    return this;
  }

  async refreshCount() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.filter((d) => d.kind === 'videoinput');
      this.cameraCount = this.devices.length;
    } catch {
      this.devices = [];
      this.cameraCount = 0;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
  }

  // Phones: toggle front/back. Desktops: cycle through the connected webcams.
  async flip() {
    if (this.hasFacingMode) {
      const next = this.facing === 'user' ? 'environment' : 'user';
      try {
        await this.start({ facing: next, exact: true });
        return;
      } catch {
        /* exact facing mode unavailable: fall back to cycling through devices */
      }
    }
    await this.refreshCount();
    if (!this.devices || this.devices.length < 2) {
      await this.start({ facing: this.facing });
      return;
    }
    const idx = this.devices.findIndex((d) => d.deviceId === this.deviceId);
    const next = this.devices[(idx + 1) % this.devices.length];
    await this.start({ deviceId: next.deviceId, facing: 'environment' });
    // Desktop webcams report no facing mode: keep them mirrored like a selfie view.
    if (!this.hasFacingMode) this.facing = 'user';
  }

  capture(maxSide = 1920) {
    const v = this.video;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const k = Math.min(1, maxSide / Math.max(vw, vh));
    const c = document.createElement('canvas');
    c.width = Math.round(vw * k);
    c.height = Math.round(vh * k);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return c;
  }
}
