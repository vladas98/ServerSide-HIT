'use strict';

// load environment variables from .env file
require('dotenv').config();
// connect to the database and start the server
const { connectToDatabase } = require('../../lib/db');
// import the createApp function and PROCESS_NAME constant from app.js
const { createApp, PROCESS_NAME } = require('./app');

async function start() {
  await connectToDatabase(PROCESS_NAME);
  //createApp is located in app.js and it returns an object with the express app and logger
  const { app, logger } = createApp();
// hosting providers assign their own PORT and ignore what you request,
// so it takes priority; PORT_USERS is for running everything locally
  const port = process.env.PORT || process.env.PORT_USERS || 3002;
  app.listen(port, () => {
    logger.pino.info(`${PROCESS_NAME} listening on port ${port}`);
  });
}

start();
