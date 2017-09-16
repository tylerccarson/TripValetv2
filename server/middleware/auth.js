const session = require('express-session');
const RedisStore = require('connect-redis')(session);
var redisClient;

//connect with Heroku Redis if in production -- CAN PROBABLY REMOVE THIS IF RUNNING ONE IN A CONCURRENT DOCKER CONTAINER
if (process.env.NODE_ENV === 'production') {
  console.log('REDIS IN PRODUCTION');
  redisClient = require('redis').createClient(process.env.REDIS_URL);
} else {
  console.log('REDIS IN DEVELOPMENT');
  redisClient = require('redis').createClient('6379', 'redis');
}

module.exports.verify = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

module.exports.session = session({
  store: new RedisStore({
    client: redisClient,
    host: '172.17.0.2/16',
    port: 6379
  }),
  secret: 'more laughter, more love, more life',
  resave: false,
  saveUninitialized: false
});
