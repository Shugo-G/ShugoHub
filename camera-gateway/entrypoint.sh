#!/bin/sh
# ── Recodifica el RTSP (H.264, sub-stream baja res) a HLS con GOP corto para baja latencia ──
# El GOP de la cámara es largo (~8s); sin recodificar, los segmentos HLS quedarían
# atados a ese intervalo. Recodificar esta resolución chica es barato y permite
# forzar un keyframe por segundo -> segmentos de 1s reales.
set -u

while true; do
  ffmpeg -nostdin -loglevel warning \
    -rtsp_transport tcp -i "$CAMERA_RTSP_URL" \
    -an \
    -c:v libx264 -preset ultrafast -tune zerolatency -crf 23 -maxrate 1500k -bufsize 1500k \
    -force_key_frames "expr:gte(t,n_forced*1)" -sc_threshold 0 \
    -f hls -hls_time 1 -hls_list_size 4 \
    -hls_flags delete_segments+append_list+omit_endlist+independent_segments \
    -hls_segment_filename "/hls/cam2-%03d.ts" \
    /hls/cam2.m3u8
  echo "[camera-gateway] ffmpeg terminó, reintentando en 5s..."
  sleep 5
done
