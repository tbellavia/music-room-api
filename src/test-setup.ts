import { Logger } from '@nestjs/common';

// Keeps the output of `npm test` readable: the use-cases log their events,
// the tests check behaviour, not log lines
Logger.overrideLogger(false);
