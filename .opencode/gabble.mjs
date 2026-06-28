// Gabble — OpenCode plugin
// Copy to .opencode/gabble.mjs or install via: gabble-init -g --opencode

export default {
  name: 'gabble',
  version: '1.0.0',
  description: 'Lazy dev + token optimizer — transparent bash command filtering',

  // Auto-rewrite: intercept bash commands and prefix with gabble filter
  async 'tool.execute.before'(ctx) {
    if (ctx.tool !== 'bash') return;

    const cmd = ctx.input?.command || '';
    if (!cmd || cmd.startsWith('gabble ')) return;

    // Commands that benefit from filtering
    const FILTERABLE = /^(git|gh|pytest|cargo test|go test|npm test|pnpm test|yarn test|npx jest|npx vitest|npx playwright|eslint|npx eslint|prettier|ruff|golangci-lint|cargo clippy|tsc|cargo build|cargo check|next build|docker|kubectl|oc |ls |tree |find |grep |rg |curl |wget )/;

    if (FILTERABLE.test(cmd)) {
      ctx.input = { ...ctx.input, command: `gabble ${cmd}` };
    }
  },
};
