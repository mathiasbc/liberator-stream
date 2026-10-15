// Timestamped lines for the launchd log file. Every message passes through
// redact(), so the stream key never reaches the logs, even inside ffmpeg's
// error messages.

const secrets = new Set();

const addSecret = (value) => {
  if (value) secrets.add(value);
};

const redact = (text) => {
  let out = String(text);
  for (const secret of secrets) out = out.split(secret).join('<stream-key>');
  return out;
};

const format = (arg) => {
  if (arg instanceof Error) return arg.stack || arg.message;
  return typeof arg === 'string' ? arg : JSON.stringify(arg);
};

const write = (stream, level, args) => {
  const message = redact(args.map(format).join(' '));
  stream.write(`${new Date().toISOString()} ${level} ${message}\n`);
};

module.exports = {
  addSecret,
  redact,
  info: (...args) => write(process.stdout, 'INFO', args),
  warn: (...args) => write(process.stderr, 'WARN', args),
  error: (...args) => write(process.stderr, 'ERROR', args),
};
