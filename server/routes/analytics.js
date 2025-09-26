import express from 'express';

const router = express.Router();

// Placeholder analytics routes
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Analytics not implemented yet' });
});

router.get('/stats', (req, res) => {
  res.status(501).json({ error: 'Analytics not implemented yet' });
});

export default router;
