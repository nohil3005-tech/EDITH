import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

function buildTransport() {
  if (!isDev) return undefined;
  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    };
  } catch {
    // pino-pretty not available — fall back to JSON
    return undefined;
  }
}

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: buildTransport(),
  base: { service: 'edith-backend' },
});
