import express from 'express';

// Import all resource routers
import participantsRouter from './participants.routes.js';
import roundsRouter from './rounds.routes.js';
import newsRouter from './news.routes.js';
import cityTipsRouter from './city-tips.routes.js';
import timetableRouter from './timetable.routes.js';
import linksRouter from './links.routes.js';
import schnellzugriffRouter from './schnellzugriff.routes.js';
import infoPagesRouter from './info-pages.routes.js';
import systemRouter from './system.routes.js';
import bulkRouter from './bulkRoutes.js';

const router = express.Router();

// Mount all resource routers
router.use('/participants', participantsRouter);
router.use('/rounds', roundsRouter);
router.use('/news', newsRouter);
router.use('/city-tips', cityTipsRouter);
router.use('/timetable', timetableRouter);
router.use('/links', linksRouter);
router.use('/schnellzugriff', schnellzugriffRouter);
router.use('/info-pages', infoPagesRouter);
router.use('/bulk', bulkRouter); // Bulk operations endpoints
router.use('/', systemRouter); // Health, countdown, cache endpoints

export default router;
