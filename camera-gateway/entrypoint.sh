#!/bin/sh
# ── Recodifica el RTSP (H.264, sub-stream baja res) a HLS con GOP corto para baja latencia ──
# El GOP de la cámara es largo (~8s); sin recodificar, los segmentos HLS quedarían
# atados a ese intervalo. Recodificar esta resolución chica es barato y permite
# forzar un keyframe por segundo -> segmentos de 1s reales.
set -u

# Backoff exponencial: si el NVR se cuelga o devuelve basura muchas veces seguidas,
# dejamos de bombardearlo cada 5s (eso fue justamente lo que le agotó las sesiones
# RTSP del canal una vez) y vamos espaciando los reintentos hasta un máximo.
BASE_SLEEP=5
MAX_SLEEP=60
sleep_s=$BASE_SLEEP

while true; do
  start_ts=$(date +%s)
  ffmpeg -nostdin -loglevel warning \
    -rtsp_transport tcp -timeout 10000000 -i "$CAMERA_RTSP_URL" \
    -an \
    -c:v libx264 -preset ultrafast -tune zerolatency -crf 23 -maxrate 2500k -bufsize 2500k \
    -force_key_frames "expr:gte(t,n_forced*1)" -sc_threshold 0 \
    -f hls -hls_time 1 -hls_list_size 4 \
    -hls_flags delete_segments+append_list+omit_endlist+independent_segments \
    -hls_segment_filename "/hls/cam2-%03d.ts" \
    /hls/cam2.m3u8
  end_ts=$(date +%s)

  if [ $((end_ts - start_ts)) -ge 30 ]; then
    sleep_s=$BASE_SLEEP
  else
    sleep_s=$((sleep_s * 2))
    [ "$sleep_s" -gt "$MAX_SLEEP" ] && sleep_s=$MAX_SLEEP
  fi

  echo "[camera-gateway] ffmpeg terminó, reintentando en ${sleep_s}s..."
  sleep "$sleep_s"
done
