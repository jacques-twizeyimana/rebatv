#!/usr/bin/env bash
#
# rebaTV deploy script, run on the VPS (by GitHub Actions over SSH, or by hand).
#
#   deploy.sh [<git ref>]        fetch + build <ref> (default: origin/main), switch to it, restart,
#                                health-check, and roll back automatically if it doesn't come up
#   deploy.sh --rollback [<id>]  switch to the previous release (or release <id>) and restart
#   deploy.sh --list             list releases
#
# Layout under APP_ROOT (default /srv/rebatv):
#   repo/          git clone; builds run here, so node_modules and .next/cache stay warm
#   shared/.env    production environment: DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_SITE_URL, …
#   releases/<UTC timestamp>-<short sha>/   self-contained `next build` standalone output
#   current -> releases/<id>     systemd runs `node server.js` in here (deploy/rebatv.service)
#
# Only the KEEP_RELEASES newest releases are kept: the live one plus 2 to roll back to.
# Rolling back does NOT undo database migrations, so keep migrations backwards compatible.

set -Eeuo pipefail

APP_ROOT=${APP_ROOT:-/srv/rebatv}
REPO=$APP_ROOT/repo
RELEASES=$APP_ROOT/releases
CURRENT=$APP_ROOT/current
ENV_FILE=${ENV_FILE:-$APP_ROOT/shared/.env}
KEEP_RELEASES=${KEEP_RELEASES:-3}
RESTART_CMD=${RESTART_CMD:-sudo systemctl restart rebatv}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/healthz}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-60}

log() { printf '\033[1m[deploy %s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

current_release() {
  if [[ -L $CURRENT ]]; then basename "$(readlink "$CURRENT")"; fi
}

# Newest first; release ids start with a UTC timestamp, so name order is age order.
list_releases() {
  if [[ -d $RELEASES ]]; then
    find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort -r
  fi
}

# Atomically repoint `current` (a relative symlink) at a release.
switch_to() {
  ln -sfn "releases/$1" "$CURRENT.next"
  mv -fT "$CURRENT.next" "$CURRENT" 2>/dev/null || mv -fh "$CURRENT.next" "$CURRENT"
  log "current -> releases/$1"
}

restart() {
  log "Restarting: $RESTART_CMD"
  bash -c "$RESTART_CMD"
}

health_check() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  log "Health check: $HEALTH_URL (up to ${HEALTH_TIMEOUT}s)"
  until curl -fsS -o /dev/null --max-time 10 "$HEALTH_URL"; do
    if ((SECONDS >= deadline)); then return 1; fi
    sleep 2
  done
  log "Healthy"
}

prune() {
  local live keep=0 r
  live=$(current_release)
  for r in $(list_releases); do
    keep=$((keep + 1))
    if ((keep > KEEP_RELEASES)) && [[ $r != "$live" ]]; then
      log "Pruning old release $r"
      rm -rf "${RELEASES:?}/$r"
    fi
  done
}

lock() {
  mkdir -p "$APP_ROOT"
  if command -v flock >/dev/null; then
    exec 9>"$APP_ROOT/.deploy.lock"
    flock -n 9 || die "another deploy is running"
  fi
}

rollback() {
  local target=${1:-} live r found=""
  live=$(current_release)
  if [[ -z $target ]]; then
    # The newest release older than the live one.
    for r in $(list_releases); do
      if [[ -n $found ]]; then target=$r; break; fi
      [[ $r == "$live" ]] && found=1
    done
  fi
  [[ -n $target && -d $RELEASES/$target ]] || die "no release to roll back to (live: ${live:-none})"
  switch_to "$target"
  if ! restart || ! health_check; then die "release $target did not come up"; fi
}

# Stage 2: build the commit that's checked out in $REPO and release it.
build_and_release() {
  local id dest previous
  cd "$REPO"
  [[ -f $ENV_FILE ]] || die "missing $ENV_FILE"

  # next build prerenders pages from the database, so it needs the production environment.
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  # pnpm skips devDependencies (TypeScript, drizzle-kit…) when NODE_ENV=production; next build sets it itself.
  unset NODE_ENV
  # Corepack provides the pnpm pinned in package.json; never stop to ask before downloading it.
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  command -v pnpm >/dev/null || die "pnpm not found for $(id -un): install Node 22 system-wide and run 'sudo corepack enable'"

  id="$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
  dest=$RELEASES/$id
  log "Building $(git rev-parse --short HEAD): $(git log -1 --format=%s)"

  pnpm install --frozen-lockfile
  log "Running database migrations"
  pnpm db:migrate
  pnpm build

  [[ -f .next/standalone/server.js ]] || die "no standalone output (is output: \"standalone\" set in next.config.ts?)"
  log "Assembling release $id"
  mkdir -p "$dest/.next"
  trap 'rm -rf "$dest"' ERR
  cp -a .next/standalone/. "$dest/"
  cp -a .next/static "$dest/.next/static"
  if [[ -d public ]]; then cp -a public "$dest/public"; fi
  git rev-parse HEAD >"$dest/REVISION"
  trap - ERR

  previous=$(current_release)
  switch_to "$id"
  # A failed restart (e.g. the service isn't installed) is handled like a failed health check.
  if ! restart || ! health_check; then
    log "New release did not come up"
    if [[ -n $previous ]]; then
      log "Rolling back to $previous"
      switch_to "$previous"
      if ! restart || ! health_check; then log "WARNING: previous release $previous did not come up either"; fi
    fi
    rm -rf "$dest"
    die "deploy of $id failed"
  fi

  prune
  log "Deployed $id"
}

case "${1:-}" in
  --list)
    live=$(current_release)
    for r in $(list_releases); do
      if [[ $r == "$live" ]]; then echo "* $r (live)"; else echo "  $r"; fi
    done
    ;;
  --rollback)
    lock
    rollback "${2:-}"
    ;;
  --build)
    # Internal: invoked by stage 1 after checking out the commit, so the build always runs
    # with that commit's own copy of this script. The lock (fd 9) is inherited.
    build_and_release
    ;;
  -*)
    die "unknown option $1 (see the header of this script)"
    ;;
  *)
    # Stage 1: fetch and check out the requested ref, then re-run this script from that checkout.
    lock
    ref=${1:-origin/main}
    [[ -d $REPO/.git ]] || die "no git clone at $REPO"
    cd "$REPO"
    log "Fetching $ref"
    git fetch --prune --tags origin
    git checkout --force --detach "$ref"
    # Drop stray files but keep dependencies and Next's build cache warm.
    git clean -ffdx -e node_modules -e .next
    exec "$REPO/deploy/deploy.sh" --build
    ;;
esac
