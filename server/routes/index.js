import express from 'express';

// Import all resource routers
import authRouter from './auth.routes.js';
import participantsRouter from './participants.routes.js';
import teamsRouter from './teams.routes.js';
import simplifiedRoundsRouter from './simplifiedRounds.routes.js';
import newsRouter from './news.routes.js';
import cityTipsRouter from './city-tips.routes.js';
import timetableRouter from './timetable.routes.js';
import linksRouter from './links.routes.js';
import schnellzugriffRouter from './schnellzugriff.routes.js';
import infoPagesRouter from './info-pages.routes.js';
import settingsRouter from './settings.routes.js';
import userAuthRouter from './userAuth.routes.js';
// System and bulk routes removed - using simple routes instead

const router = express.Router();

// Mount authentication routes first
router.use('/auth', authRouter);

// Mount all resource routers
router.use('/participants', participantsRouter);
router.use('/teams', teamsRouter);
router.use('/rounds', simplifiedRoundsRouter);
router.use('/news', newsRouter);
router.use('/city-tips', cityTipsRouter);
router.use('/timetable', timetableRouter);
router.use('/links', linksRouter);
router.use('/schnellzugriff', schnellzugriffRouter);
router.use('/info-pages', infoPagesRouter);
router.use('/settings', settingsRouter);
router.use('/user-auth', userAuthRouter);

// Direct breaking-news route for backward compatibility
import breakingNewsRouter from './breaking-news.routes.js';
router.use('/breaking-news', breakingNewsRouter);

// Countdown config route
import countdownConfigRouter from './countdown-config.routes.js';
router.use('/countdown-config', countdownConfigRouter);
// System and bulk routes removed - using simple routes instead

export default router;
