#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/assets/screenshots"

mkdir -p "$OUT_DIR"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun no esta disponible. Este script requiere Xcode + iOS Simulator."
  exit 1
fi

BOOTED_UDID="$(xcrun simctl list devices booted | awk -F '[()]' '/\(Booted\)/ {print $2; exit}')"

if [[ -z "$BOOTED_UDID" ]]; then
  TARGET_UDID="$(xcrun simctl list devices available | awk -F '[()]' '/Etiove iPhone 17|iPhone 17|iPhone 16/ {print $2; exit}')"
  if [[ -z "$TARGET_UDID" ]]; then
    echo "No hay dispositivos iOS disponibles en Simulator.app."
    echo "Instala un runtime de iOS (Xcode > Settings > Components) y reintenta."
    exit 1
  fi

  echo "No habia simulador encendido. Arrancando $TARGET_UDID..."
  open -a Simulator >/dev/null 2>&1 || true
  xcrun simctl boot "$TARGET_UDID" >/dev/null 2>&1 || true
  BOOT_READY=0
  for _ in $(seq 1 60); do
    if xcrun simctl list devices booted | grep -q "$TARGET_UDID"; then
      BOOT_READY=1
      break
    fi
    sleep 2
  done
  if [[ "$BOOT_READY" -ne 1 ]]; then
    echo "El simulador no termino de arrancar a tiempo."
    echo "Abre Simulator manualmente y espera a que termine de iniciar, luego reintenta."
    exit 1
  fi
  BOOTED_UDID="$TARGET_UDID"
fi

capture_step() {
  local file_name="$1"
  local label="$2"
  echo
  echo "Navega a: $label"
  read -r -p "Pulsa Enter para capturar $file_name... "
  xcrun simctl io "$BOOTED_UDID" screenshot "$OUT_DIR/$file_name"
  echo "Guardado: $OUT_DIR/$file_name"
}

click_rel() {
  local rx="$1"
  local ry="$2"
  local geom gx gy gw gh x y
  geom="$(osascript -e 'tell application "Simulator" to activate' -e 'tell application "System Events" to tell process "Simulator" to get {position, size} of front window')"
  gx="$(echo "$geom" | awk -F',' '{gsub(/ /,""); print $1}')"
  gy="$(echo "$geom" | awk -F',' '{gsub(/ /,""); print $2}')"
  gw="$(echo "$geom" | awk -F',' '{gsub(/ /,""); print $3}')"
  gh="$(echo "$geom" | awk -F',' '{gsub(/ /,""); print $4}')"
  x="$(awk -v gx="$gx" -v gw="$gw" -v rx="$rx" 'BEGIN {printf "%d", gx + gw*rx}')"
  y="$(awk -v gy="$gy" -v gh="$gh" -v ry="$ry" 'BEGIN {printf "%d", gy + gh*ry}')"
  osascript -e 'tell application "System Events" to tell process "Simulator" to click at {'"$x"','"$y"'}'
}

capture_auto() {
  echo "Modo AUTO: intentando navegar y capturar sin intervencion."

  # Inicio
  click_rel 0.13 0.93
  sleep 1
  xcrun simctl io "$BOOTED_UDID" screenshot "$OUT_DIR/home.png"

  # Detalle cafe (primer card aproximado)
  click_rel 0.20 0.42
  sleep 1
  xcrun simctl io "$BOOTED_UDID" screenshot "$OUT_DIR/detail.png"

  # Cerrar detalle
  click_rel 0.10 0.12
  sleep 1

  # Comunidad
  click_rel 0.30 0.93
  sleep 1
  xcrun simctl io "$BOOTED_UDID" screenshot "$OUT_DIR/community.png"

  # Mas -> Perfil
  click_rel 0.87 0.93
  sleep 1
  click_rel 0.28 0.46
  sleep 1
  xcrun simctl io "$BOOTED_UDID" screenshot "$OUT_DIR/profile.png"

  # Volver -> Inicio -> intento CTA de cafeterias
  click_rel 0.10 0.12
  sleep 1
  click_rel 0.13 0.93
  sleep 1
  click_rel 0.88 0.76
  sleep 1
  xcrun simctl io "$BOOTED_UDID" screenshot "$OUT_DIR/cafeterias.png"

  echo "Modo AUTO completado."
}

echo "Captura guiada iniciada sobre simulador: $BOOTED_UDID"

echo
echo "Se van a generar estas capturas:"
echo "- home.png"
echo "- detail.png"
echo "- community.png"
echo "- profile.png"
echo "- cafeterias.png"

if [[ "${AUTO_CAPTURE:-0}" == "1" ]]; then
  capture_auto
else
  capture_step "home.png" "Inicio premium (wordmark + cards)"
  capture_step "detail.png" "Detalle de cafe"
  capture_step "community.png" "Comunidad / foro"
  capture_step "profile.png" "Perfil + gamificacion"
  capture_step "cafeterias.png" "Cafeterias cercanas"
fi

echo
echo "Listo. Capturas guardadas en $OUT_DIR"
