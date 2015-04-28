module.exports = {
  ip:       process.env.IP ||
            undefined,

  port:     process.env.PORT ||
            9005,

  client_id: process.env.UBER_CLIENT_ID,

  client_secret: process.env.UBER_SECRET,

  state: process.env.UBER_STATE || '',

  NODE_ENV: process.env.NODE_ENV || 'production'

};