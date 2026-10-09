#!/bin/sh
# ── Transcodifica el RTSP (H.265) de la cámara a H.264 + HLS, servido luego por nginx ──
set -u

while true; do
  ffmpeg -nostdin -loglevel warning \
    -rtsp_transport tcp -i "$CAMERA_RTSP_URL" \
    -an \
    -c:v libx264 -preset veryfast -tune zerolatency -crf 23 -maxrate 2000k -bufsize 4000k \
    -g 50 -sc_threshold 0 \
    -f hls -hls_time 2 -hls_list_size 6 \
    -hls_flags delete_segments+append_list+omit_endlist+independent_segments \
    -hls_segment_filename "/hls/cam2-%03d.ts" \
    /hls/cam2.m3u8
  echo "[camera-gateway] ffmpeg terminó, reintentando en 5s..."
  sleep 5
done
