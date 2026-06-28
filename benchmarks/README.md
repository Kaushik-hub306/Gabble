# Gabble Benchmarks

Methodology for measuring gabble's combined impact (lazy dev + token
optimizer) vs. no-skill baseline.

## Test Tasks (same as ponytail benchmark suite)

1. **Email validator** — validate email format with regex + DNS check
2. **Debounce utility** — rate-limiting function wrapper
3. **CSV sum** — parse CSV and sum a column
4. **Countdown timer** — UI component with start/pause/reset
5. **Rate limiter** — token bucket algorithm

## Models Tested

- Claude Haiku 4.5 (fastest/cheapest)
- Claude Sonnet 4.6 (balanced)
- Claude Opus 4.8 (most capable)

## Metrics

| Metric | How measured |
|--------|-------------|
| Lines of code | `cloc` on final diff (excl. blank lines, comments) |
| Tokens consumed | Total prompt + completion tokens per task |
| Cost | Token count × model price per 1k tokens |
| Wall time | End-to-end from task prompt to passing output |
| Safety | Manual check: input validation, error handling, edge cases |

## Baseline: No-Skill

Plain Claude Code with no behavior modifier. Default system prompt only.

## Gabble: Full Mode

Combined lazy-dev ladder + token optimization rules active.

## Gabble: Ultra Mode

YAGNI extremist + aggressive context compression.

## Expected Results

Based on ponytail's measured -54% LOC / -22% tokens / -20% cost, plus
rtk's measured -80% tokens on command output, gabble full mode should
achieve:

| Metric | Conservative | Optimistic |
|--------|-------------|-----------|
| Lines of code | -50% | -80% |
| Token consumption | -40% | -70% |
| Cost | -35% | -65% |
| Speed | 2× faster | 5× faster |
| Safety | 100% | 100% |

## Running Benchmarks

```bash
# Install promptfoo
npm install -g promptfoo

# Run benchmark suite
cd benchmarks
promptfoo eval

# View results
promptfoo view
```

## Methodology Notes

- Each task runs n=4 to control for LLM variance
- Results report median, not mean (resistant to outliers)
- Safety is scored 0 or 1 (all-or-nothing per task)
- "Lines of code" counts only final working diff, not iteration attempts
