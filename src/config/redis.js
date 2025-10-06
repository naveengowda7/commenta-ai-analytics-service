const redisConnection = {
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: 13298,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

module.exports = { redisConnection };