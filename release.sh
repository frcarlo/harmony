#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────
#  HArmony — Release Script
#  Usage: ./release.sh [patch|minor|major]
# ─────────────────────────────────────────────

BUMP=${1:-""}
PACKAGE="nuxt/package.json"

# ── Colors ────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}→${RESET} $1"; }
success() { echo -e "${GREEN}✓${RESET} $1"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $1"; }
error()   { echo -e "${RED}✗${RESET} $1"; exit 1; }

# ── Read current version ───────────────────────
CURRENT=$(python3 -c "
import json, sys
try:
    d = json.load(open('$PACKAGE'))
    v = d.get('version','')
    if not v: raise KeyError
    print(v)
except:
    sys.exit(1)
" 2>/dev/null) || CURRENT=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.0.0")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

echo -e "\n${BOLD}HArmony Release${RESET}"
echo -e "Current version: ${YELLOW}v${CURRENT}${RESET}\n"

# ── Choose bump type ───────────────────────────
if [[ -z "$BUMP" ]]; then
  echo "Bump type:"
  echo "  1) patch  (v${MAJOR}.${MINOR}.$((PATCH+1)))"
  echo "  2) minor  (v${MAJOR}.$((MINOR+1)).0)"
  echo "  3) major  (v$((MAJOR+1)).0.0)"
  echo ""
  read -rp "Choose [1/2/3]: " CHOICE
  case "$CHOICE" in
    1) BUMP="patch" ;;
    2) BUMP="minor" ;;
    3) BUMP="major" ;;
    *) error "Invalid choice" ;;
  esac
fi

# ── Calculate new version ──────────────────────
case "$BUMP" in
  patch) NEW="${MAJOR}.${MINOR}.$((PATCH+1))" ;;
  minor) NEW="${MAJOR}.$((MINOR+1)).0" ;;
  major) NEW="$((MAJOR+1)).0.0" ;;
  *) error "Unknown bump type: $BUMP. Use patch, minor or major." ;;
esac

echo -e "New version:     ${GREEN}v${NEW}${RESET}\n"
read -rp "Continue? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { warn "Aborted."; exit 0; }

# ── Optional GitHub Release ───────────────────
CREATE_RELEASE=false
read -rp "Create GitHub Release? [y/N] " GH_CONFIRM
[[ "$GH_CONFIRM" =~ ^[Yy]$ ]] && CREATE_RELEASE=true

RELEASE_NOTES=""
if $CREATE_RELEASE; then
  echo ""
  echo "Release notes (leave empty for auto):"
  read -rp "> " RELEASE_NOTES
fi

# ── Bump version in package.json ──────────────
info "Bumping version in package.json..."
python3 -c "
import json
with open('$PACKAGE') as f: d = json.load(f)
d['version'] = '${NEW}'
with open('$PACKAGE', 'w') as f: json.dump(d, f, indent=2, ensure_ascii=False)
print('  ' + '${CURRENT}' + ' → ' + '${NEW}')
"

# ── Git commit & tag ───────────────────────────
info "Committing..."
git add "$PACKAGE"
git commit -m "chore: bump version to v${NEW}"

info "Creating tag v${NEW}..."
git tag -a "v${NEW}" -m "HArmony v${NEW}"

info "Pushing to GitHub..."
git push origin main
git push origin "v${NEW}"

success "v${NEW} pushed to GitHub"

# ── GitHub Release ────────────────────────────
if $CREATE_RELEASE; then
  if ! command -v gh &>/dev/null; then
    warn "gh CLI not installed — skipping GitHub Release."
    warn "Install: https://cli.github.com/"
  else
    info "Creating GitHub Release..."
    if [[ -n "$RELEASE_NOTES" ]]; then
      gh release create "v${NEW}" \
        --title "HArmony v${NEW}" \
        --notes "$RELEASE_NOTES"
    else
      gh release create "v${NEW}" \
        --title "HArmony v${NEW}" \
        --generate-notes
    fi
    success "GitHub Release v${NEW} created"
  fi
fi

echo ""
echo -e "${BOLD}${GREEN}Released HArmony v${NEW} 🎉${RESET}"
