#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────
#  HArmony — Release Script
#  Usage:
#    ./release.sh [patch|minor|major]
#    ./release.sh --release-only [--tag v4.5.0]
# ─────────────────────────────────────────────

PACKAGE="nuxt/package.json"
BUMP=""
RELEASE_ONLY=false
RELEASE_TAG=""
YES=false
TAG_COUNT=12

# ── Colors ────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}→${RESET} $1"; }
success() { echo -e "${GREEN}✓${RESET} $1"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $1"; }
error()   { echo -e "${RED}✗${RESET} $1"; exit 1; }

usage() {
  cat <<EOF
Usage:
  ./release.sh [patch|minor|major]
  ./release.sh --release-only [--tag v4.5.0]

Options:
  --release-only       Create/publish a GitHub Release for an existing tag only.
  --tag <tag>          Use this tag for --release-only.
  --tag-count <n>      Number of recent tags to show in the picker (default: ${TAG_COUNT}).
  -y, --yes            Skip confirmation prompts where possible.
  -h, --help           Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    patch|minor|major)
      [[ -z "$BUMP" ]] || error "Bump type already set to '$BUMP'"
      BUMP="$1"
      shift
      ;;
    --release-only|--only-release|release-only)
      RELEASE_ONLY=true
      shift
      ;;
    --tag)
      [[ $# -ge 2 ]] || error "--tag needs a value"
      RELEASE_TAG="$2"
      shift 2
      ;;
    --tag=*)
      RELEASE_TAG="${1#--tag=}"
      shift
      ;;
    --tag-count)
      [[ $# -ge 2 ]] || error "--tag-count needs a value"
      TAG_COUNT="$2"
      shift 2
      ;;
    --tag-count=*)
      TAG_COUNT="${1#--tag-count=}"
      shift
      ;;
    -y|--yes)
      YES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "Unknown argument: $1"
      ;;
  esac
done

[[ "$TAG_COUNT" =~ ^[0-9]+$ ]] || error "--tag-count must be a number"

confirm() {
  local prompt="$1"
  if $YES; then
    return 0
  fi
  read -rp "$prompt [y/N] " CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]]
}

release_notes_prompt() {
  RELEASE_NOTES=""
  echo ""
  echo "Release notes (leave empty for auto-generated notes):"
  read -rp "> " RELEASE_NOTES
}

create_github_release() {
  local tag="$1"
  local title="${2:-HArmony ${tag}}"
  local notes="${3:-}"

  if ! command -v gh &>/dev/null; then
    warn "gh CLI not installed — skipping GitHub Release."
    warn "Install: https://cli.github.com/"
    return 0
  fi

  if gh release view "$tag" &>/dev/null; then
    warn "GitHub Release ${tag} already exists."
    confirm "Update existing release title/notes?" || return 0
    if [[ -n "$notes" ]]; then
      gh release edit "$tag" --title "$title" --notes "$notes"
    else
      gh release edit "$tag" --title "$title" --generate-notes
    fi
    success "GitHub Release ${tag} updated"
    return 0
  fi

  info "Creating GitHub Release ${tag}..."
  if [[ -n "$notes" ]]; then
    gh release create "$tag" --title "$title" --notes "$notes"
  else
    gh release create "$tag" --title "$title" --generate-notes
  fi
  success "GitHub Release ${tag} created"
}

select_recent_tag() {
  mapfile -t TAG_ROWS < <(
    git for-each-ref \
      --sort=-creatordate \
      --count="$TAG_COUNT" \
      --format='%(refname:short)%09%(contents:subject)' \
      refs/tags
  )

  [[ ${#TAG_ROWS[@]} -gt 0 ]] || error "No tags found."

  echo ""
  echo "Recent tags:"
  local i=1
  local row tag comment
  for row in "${TAG_ROWS[@]}"; do
    tag="${row%%$'\t'*}"
    comment="${row#*$'\t'}"
    [[ "$comment" == "$tag" ]] && comment=""
    printf "  %2d) %s" "$i" "$tag"
    [[ -n "$comment" ]] && printf " — %s" "$comment"
    printf "\n"
    i=$((i + 1))
  done

  echo ""
  read -rp "Choose tag [1-${#TAG_ROWS[@]}] or enter tag name: " TAG_CHOICE
  if [[ "$TAG_CHOICE" =~ ^[0-9]+$ ]]; then
    (( TAG_CHOICE >= 1 && TAG_CHOICE <= ${#TAG_ROWS[@]} )) || error "Invalid tag choice"
    RELEASE_TAG="${TAG_ROWS[$((TAG_CHOICE - 1))]%%$'\t'*}"
  else
    RELEASE_TAG="$TAG_CHOICE"
  fi
}

if $RELEASE_ONLY; then
  echo -e "\n${BOLD}HArmony Release Only${RESET}"

  if [[ -z "$RELEASE_TAG" ]]; then
    select_recent_tag
  fi

  git rev-parse -q --verify "refs/tags/${RELEASE_TAG}" >/dev/null || error "Tag not found: ${RELEASE_TAG}"

  TAG_COMMENT=$(git for-each-ref --format='%(contents:subject)' "refs/tags/${RELEASE_TAG}")
  echo ""
  echo -e "Selected tag: ${GREEN}${RELEASE_TAG}${RESET}"
  [[ -n "$TAG_COMMENT" ]] && echo -e "Tag comment:  ${YELLOW}${TAG_COMMENT}${RESET}"
  confirm "Create GitHub Release for ${RELEASE_TAG}?" || { warn "Aborted."; exit 0; }

  release_notes_prompt
  create_github_release "$RELEASE_TAG" "HArmony ${RELEASE_TAG}" "$RELEASE_NOTES"
  echo ""
  echo -e "${BOLD}${GREEN}Released ${RELEASE_TAG}${RESET}"
  exit 0
fi

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
confirm "Continue?" || { warn "Aborted."; exit 0; }

# ── Optional GitHub Release ───────────────────
CREATE_RELEASE=false
confirm "Create GitHub Release?" && CREATE_RELEASE=true

RELEASE_NOTES=""
if $CREATE_RELEASE; then
  release_notes_prompt
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

# ── Update README badge ───────────────────────
info "Updating README version badge..."
sed -i "s|version-v[0-9]*\.[0-9]*\.[0-9]*-blue|version-v${NEW}-blue|g" README.md

# ── Git commit & tag ───────────────────────────
info "Committing..."
git add "$PACKAGE" README.md
git commit -m "chore: bump version to v${NEW}"

info "Creating tag v${NEW}..."
git tag -a "v${NEW}" -m "HArmony v${NEW}"

info "Pushing to GitHub..."
git push origin main
git push origin "v${NEW}"

success "v${NEW} pushed to GitHub"

# ── GitHub Release ────────────────────────────
if $CREATE_RELEASE; then
  create_github_release "v${NEW}" "HArmony v${NEW}" "$RELEASE_NOTES"
fi

echo ""
echo -e "${BOLD}${GREEN}Released HArmony v${NEW} 🎉${RESET}"
