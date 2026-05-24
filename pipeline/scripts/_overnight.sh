#!/usr/bin/env bash
# Overnight runner: wait for in-progress extract, then retry any failures,
# render all views, and write a summary report.

set -u
cd "$(dirname "$0")/.."

LOG="data/overnight.log"
REPORT="data/overnight-report.md"
mkdir -p data

echo "=== overnight run started: $(date) ===" | tee -a "$LOG"

# Step 1 — wait for any in-flight extract process to finish
while pgrep -f "node scripts/03-extract-jd.mjs" >/dev/null; do
  echo "[$(date +%H:%M:%S)] extract still running... waiting 30s" | tee -a "$LOG"
  sleep 30
done
echo "[$(date +%H:%M:%S)] no extract process active" | tee -a "$LOG"

# Step 2 — retry pass (idempotent; only touches missing files)
echo "[$(date +%H:%M:%S)] retry pass: extracting any missing JDs" | tee -a "$LOG"
node scripts/03-extract-jd.mjs --yes 2>&1 | tee -a "$LOG"

# Optional second retry — catches transient errors
echo "[$(date +%H:%M:%S)] second retry pass" | tee -a "$LOG"
node scripts/03-extract-jd.mjs --yes 2>&1 | tee -a "$LOG"

# Step 3 — render all views (force to reflect latest JSONs)
echo "[$(date +%H:%M:%S)] rendering views" | tee -a "$LOG"
node scripts/04-render-view.mjs --force 2>&1 | tee -a "$LOG"

# Step 4 — write summary report
RAW_COUNT=$(find jds-raw -name "*.md" -not -name "INDEX.md" | wc -l | tr -d ' ')
STRUCTURED_COUNT=$(find jds-structured -name "*.json" | wc -l | tr -d ' ')
VIEWS_COUNT=$(find jds-views -name "*.view.md" | wc -l | tr -d ' ')
COMPANIES=$(find jds-structured -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')

# Validation issues across all extracted JSONs
VALIDATION_ISSUES=$(grep -l "validation_issues" jds-structured/*/*.json 2>/dev/null | wc -l | tr -d ' ')

cat > "$REPORT" <<EOF
# Overnight run — report

Run completed: $(date)

## Counts

- Raw JDs:        $RAW_COUNT
- Structured:     $STRUCTURED_COUNT
- Views:          $VIEWS_COUNT
- Companies:      $COMPANIES

## Validation

- JSONs with flagged validation issues: $VALIDATION_ISSUES (these still saved; check \`extraction_notes.validation_issues\` per file)

## Cost

Total spend across all retries is in \`overnight.log\` — search for "Cost (actual):" lines and sum them.

## Next steps when you wake up

1. Open \`pipeline/jds-views/INDEX.md\` — browse a few views by company.
2. If $RAW_COUNT - $STRUCTURED_COUNT > 0, some JDs failed to extract. Look at the tail of \`pipeline/data/overnight.log\` for errors.
3. Otherwise, you're set. Move to step 05 (enrich-company-meta).

EOF

echo "[$(date +%H:%M:%S)] report written to $REPORT" | tee -a "$LOG"
echo "=== overnight run finished: $(date) ===" | tee -a "$LOG"
