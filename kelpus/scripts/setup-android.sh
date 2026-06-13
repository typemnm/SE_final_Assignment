#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$PROJECT_DIR/android"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Android SDK 경로 확인 ─────────────────────────────────────────────────
detect_sdk() {
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    echo "$ANDROID_HOME"
  elif [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    echo "$ANDROID_SDK_ROOT"
  elif [[ -d "$HOME/Library/Android/sdk" ]]; then
    echo "$HOME/Library/Android/sdk"
  elif [[ -d "$HOME/Android/Sdk" ]]; then
    echo "$HOME/Android/Sdk"
  else
    echo ""
  fi
}

SDK_PATH="$(detect_sdk)"
if [[ -z "$SDK_PATH" ]]; then
  error "Android SDK를 찾을 수 없습니다.\n  ANDROID_HOME 환경변수를 설정하거나 Android Studio를 먼저 설치하세요."
fi
info "Android SDK: $SDK_PATH"

# ── 2. npm install ───────────────────────────────────────────────────────────
info "npm install 실행 중..."
cd "$PROJECT_DIR"
npm install

# ── 3. android/ 폴더 생성 (없을 경우) ────────────────────────────────────────
if [[ ! -d "$ANDROID_DIR" ]]; then
  info "android/ 폴더가 없습니다. expo prebuild로 생성합니다..."
  if ! command -v npx &>/dev/null; then
    error "npx를 찾을 수 없습니다. Node.js를 설치하세요."
  fi
  npx expo prebuild --platform android --no-install
  info "android/ 폴더 생성 완료"
else
  info "android/ 폴더가 이미 존재합니다. 건너뜁니다."
fi

# ── 4. local.properties 설정 ─────────────────────────────────────────────────
LOCAL_PROPS="$ANDROID_DIR/local.properties"
if [[ ! -f "$LOCAL_PROPS" ]]; then
  info "local.properties 생성: sdk.dir=$SDK_PATH"
  echo "sdk.dir=$SDK_PATH" > "$LOCAL_PROPS"
else
  # sdk.dir 항목이 없으면 추가
  if ! grep -q "^sdk.dir" "$LOCAL_PROPS"; then
    echo "sdk.dir=$SDK_PATH" >> "$LOCAL_PROPS"
    info "local.properties에 sdk.dir 추가"
  else
    info "local.properties 이미 설정됨"
  fi
fi

# ── 5. 카카오 maven 저장소 추가 ───────────────────────────────────────────────
PROJECT_GRADLE="$ANDROID_DIR/build.gradle"
KAKAO_MAVEN='        maven { url "https://devrepo.kakao.com/nexus/content/groups/public/" }'

if ! grep -q "devrepo.kakao.com" "$PROJECT_GRADLE" 2>/dev/null; then
  info "카카오 maven 저장소를 build.gradle에 추가합니다..."
  # allprojects > repositories 블록 안에 삽입
  python3 - "$PROJECT_GRADLE" "$KAKAO_MAVEN" <<'PYEOF'
import sys, re

filepath = sys.argv[1]
new_line = sys.argv[2]

with open(filepath, 'r') as f:
    content = f.read()

# allprojects { repositories { ... } } 블록을 찾아 마지막 닫는 } 앞에 삽입
pattern = r'(allprojects\s*\{[^}]*repositories\s*\{)'
match = re.search(pattern, content, re.DOTALL)
if match:
    insert_pos = match.end()
    content = content[:insert_pos] + '\n' + new_line + content[insert_pos:]
    with open(filepath, 'w') as f:
        f.write(content)
    print("삽입 완료")
else:
    # allprojects 블록이 없으면 파일 끝에 추가
    content += f'\nallprojects {{\n    repositories {{\n{new_line}\n    }}\n}}\n'
    with open(filepath, 'w') as f:
        f.write(content)
    print("allprojects 블록 새로 추가")
PYEOF
else
  info "카카오 maven 저장소 이미 등록됨"
fi

# ── 6. AndroidManifest.xml 카카오 intent-filter 추가 ─────────────────────────
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

# .env에서 카카오 앱 키 읽기
KAKAO_APP_KEY=""
ENV_FILE="$PROJECT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  KAKAO_APP_KEY="$(grep -E '^KAKAO_APP_KEY=' "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")"
fi

if [[ -z "$KAKAO_APP_KEY" ]]; then
  warn ".env에 KAKAO_APP_KEY가 없습니다. AndroidManifest에 플레이스홀더를 사용합니다."
  KAKAO_APP_KEY="YOUR_KAKAO_APP_KEY"
fi

KAKAO_ACTIVITY="        <activity android:name=\"com.kakao.sdk.auth.AuthCodeHandlerActivity\" android:exported=\"true\">\n            <intent-filter>\n                <action android:name=\"android.intent.action.VIEW\" />\n                <category android:name=\"android.intent.category.DEFAULT\" />\n                <category android:name=\"android.intent.category.BROWSABLE\" />\n                <data android:host=\"oauth\" android:scheme=\"kakao${KAKAO_APP_KEY}\" />\n            </intent-filter>\n        </activity>"

if ! grep -q "AuthCodeHandlerActivity" "$MANIFEST" 2>/dev/null; then
  info "AndroidManifest.xml에 카카오 AuthCodeHandlerActivity 추가합니다..."
  # </application> 직전에 삽입
  sed -i "s|</application>|${KAKAO_ACTIVITY}\n    </application>|" "$MANIFEST"
  info "추가 완료 (scheme: kakao${KAKAO_APP_KEY})"
else
  info "카카오 Activity 이미 등록됨"
fi

# ── 7. gradle clean ───────────────────────────────────────────────────────────
info "gradle clean 실행 중..."
cd "$ANDROID_DIR"
chmod +x gradlew
./gradlew clean

info ""
info "✓ Android 설정 완료"
info "  다음 명령으로 앱을 실행하세요:"
info "  cd $PROJECT_DIR && npx react-native run-android"
