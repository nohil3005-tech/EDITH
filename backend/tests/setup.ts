import { vi, beforeAll, afterAll } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/edith_test';
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test-api-key';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock logger to suppress output in tests
vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    })),
  },
}));

// Mock database
vi.mock('../src/config/database', () => ({
  getDatabase: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    execute: vi.fn().mockResolvedValue([]),
    $dynamic: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((onFulfilled) => Promise.resolve([]).then(onFulfilled)),
  })),
  closeDatabase: vi.fn(),
}));

// Mock Redis
vi.mock('../src/config/redis', () => ({
  getRedis: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
  createRedisConnection: vi.fn(() => ({
    on: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
  closeRedis: vi.fn(),
}));

beforeAll(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});
