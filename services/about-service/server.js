'use strict';

require('dotenv').config();
const { connectToDatabase } = require('../../lib/db');
const { createApp, PROCESS_NAME } = require('./app');

async function start() {
  const { app, logger } = createApp();
  // Most hosting providers assign a port via PORT and ignore the value
  // you request, so it takes priority over the .env default.
  const port = process.env.PORT || process.env.PORT_ABOUT || 3004;

  /* The port opens before MongoDB is connected. Mongoose buffers queries
     until the connection is ready, so nothing breaks, and the process stops
     paying for the whole Atlas handshake on every cold boot before it can
     accept a single request.
     This service still connects: /api/about's access is logged to the
     logs collection like every other endpoint in the project. */
  app.listen(port, () => {
    logger.pino.info(`${PROCESS_NAME} listening on port ${port}`);
  });

  try {
    await connectToDatabase(PROCESS_NAME);
  } catch (err) {
    logger.pino.error(err, 'could not connect to MongoDB');
    process.exit(1);
  }
}

start();
