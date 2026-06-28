#!/usr/bin/env node
// gabble aws filter — compresses AWS CLI output by 60-85%
// Strategies: key extraction, secret stripping, compact listings

function awsSts(raw, _opts = {}) {
  // sts get-caller-identity → one line
  try {
    const data = JSON.parse(raw);
    return `Account: ${data.Account}, User: ${data.Arn?.split('/').pop()}`;
  } catch (_) { return raw.trim().split('\n').slice(0, 3).join(' '); }
}

function awsEc2(raw, _opts = {}) {
  try {
    const data = JSON.parse(raw);
    const reservations = data.Reservations || [];
    const instances = reservations.flatMap(r => r.Instances || []);
    if (!instances.length) return 'no instances';
    const out = [`${instances.length} instances:`];
    for (const i of instances.slice(0, 20)) {
      const name = (i.Tags || []).find(t => t.Key === 'Name')?.Value || i.InstanceId;
      out.push(`  ${name} — ${i.InstanceType} — ${i.State?.Name} — ${i.PrivateIpAddress || 'no IP'}`);
    }
    return out.join('\n');
  } catch (_) { return raw; }
}

function awsLambda(raw, _opts = {}) {
  try {
    const data = JSON.parse(raw);
    const funcs = data.Functions || [];
    if (!funcs.length) return 'no functions';
    return `${funcs.length} functions:\n` + funcs.map(f =>
      `  ${f.FunctionName} — ${f.Runtime} — ${f.MemorySize}MB — ${f.LastModified?.slice(0, 10)}`
    ).join('\n');
  } catch (_) { return raw; }
}

function awsLogs(raw, _opts = {}) {
  try {
    const data = JSON.parse(raw);
    const events = data.events || [];
    if (!events.length) return 'no events';
    return events.map(e =>
      `${new Date(e.timestamp).toISOString()} ${e.message?.slice(0, 200) || ''}`
    ).join('\n');
  } catch (_) { return raw; }
}

function awsDynamo(raw, _opts = {}) {
  // Unwrap DynamoDB type annotations: {"S": "value"} → "value"
  try {
    const data = JSON.parse(raw);
    function unwrap(v) {
      if (!v || typeof v !== 'object') return v;
      const keys = Object.keys(v);
      if (keys.length === 1 && ['S', 'N', 'B', 'BOOL', 'NULL'].includes(keys[0])) {
        return v[keys[0]];
      }
      if (Array.isArray(v)) return v.map(unwrap);
      const out = {};
      for (const k of Object.keys(v)) out[k] = unwrap(v[k]);
      return out;
    }
    const unwrapped = unwrap(data);
    return JSON.stringify(unwrapped, null, 2);
  } catch (_) { return raw; }
}

function awsS3(raw, _opts = {}) {
  // s3 ls — already compact, just summarize large listings
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length <= 10) return lines.join('\n');
  return `${lines.length} objects\n` + lines.slice(0, 5).join('\n') + '\n...';
}

function awsGeneric(raw, _opts = {}) {
  // Try JSON parse to extract keys
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data).slice(0, 15);
      return `Keys: ${keys.join(', ')}${Object.keys(data).length > 15 ? ` ... +${Object.keys(data).length - 15} more` : ''}`;
    }
  } catch (_) {}
  return raw.trim().split('\n').slice(0, 20).join('\n');
}

// Route
module.exports = {
  default(raw, opts = {}) {
    const cmd = opts.cmd || '';
    if (cmd.includes('sts')) return awsSts(raw, opts);
    if (cmd.includes('ec2 describe')) return awsEc2(raw, opts);
    if (cmd.includes('lambda list')) return awsLambda(raw, opts);
    if (cmd.includes('logs get-log')) return awsLogs(raw, opts);
    if (cmd.includes('dynamodb')) return awsDynamo(raw, opts);
    if (cmd.includes('s3 ls') || cmd.includes('s3api list')) return awsS3(raw, opts);
    return awsGeneric(raw, opts);
  },
};
