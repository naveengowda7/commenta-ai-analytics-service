const redisConnection = {
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 13298,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

module.exports = { redisConnection };