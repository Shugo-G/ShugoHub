// ── Cámara (RTSP → HLS vía camera-gateway) embebida en el panel de Agentes ──
const { useRef, useState, useEffect } = React;

function CameraFeed({ src }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls;
    let cancelled = false;
    setError(false);

    const onFatal = () => { if (!cancelled) setError(true); };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('error', onFatal);
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({ liveSyncDurationCount: 3 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.ERROR, (_evt, data) => { if (data.fatal) onFatal(); });
    } else {
      setError(true);
    }

    return () => {
      cancelled = true;
      video.removeEventListener('error', onFatal);
      if (hls) hls.destroy();
    };
  }, [src, retryTick]);

  // Si se cae el stream, reintentar cada 10s
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setRetryTick((x) => x + 1), 10_000);
    return () => clearTimeout(id);
  }, [error]);

  return (
    <div className="cam-feed">
      <video ref={videoRef} autoPlay muted playsInline />
      {error && <div className="cam-feed-overlay">Cámara no disponible · reintentando…</div>}
    </div>
  );
}

Object.assign(window, { CameraFeed });
