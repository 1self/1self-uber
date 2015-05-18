module.exports = {
  ip:       process.env.IP ||
            undefined,

  port:     process.env.PORT ||
            9005,

  session_secret: process.env.SESSION_SECRET,

  client_id: process.env.UBER_CLIENT_ID,

  client_secret: process.env.UBER_SECRET,

  app_id: '',

  app_secret: '',

  state: process.env.UBER_STATE || '',

  NODE_ENV: process.env.NODE_ENV || 'production',

  CONTEXT_URI: process.env.CONTEXT_URI,

  GEONAME_USER: process.env.GEONAME_USER

};
