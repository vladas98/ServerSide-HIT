'use strict';

require('dotenv').config();
const { connectToDatabase } = require('../../lib/db');
const { createApp, PROCESS_NAME } = require('./app');

async function start() {
  await connectToDatabase(PROCESS_NAME);
  const { app, logger } = createApp();
  // Most hosting providers assign a port via PORT and ignore the value
  // you request, so it takes priority over the .env default.
  const port = process.env.PORT || process.env.PORT_COSTS || 3003;
  app.listen(port, () => {
    logger.pino.info(`${PROCESS_NAME} listening on port ${port}`);
  });
}

start();
