'use strict';

require('dotenv').config();
const { connectToDatabase } = require('../../lib/db');
const { createApp, PROCESS_NAME } = require('./app');

async function start() {
  // Still connects to MongoDB: /api/about's access is logged to the
  // logs collection like every other endpoint in the project.
  await connectToDatabase(PROCESS_NAME);
  const { app, logger } = createApp();
  // Most hosting providers assign a port via PORT and ignore the value
  // you request, so it takes priority over the .env default.
  const port = process.env.PORT || process.env.PORT_ABOUT || 3004;
  app.listen(port, () => {
    logger.pino.info(`${PROCESS_NAME} listening on port ${port}`);
  });
}

start();
