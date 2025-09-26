import express from 'express';

const router = express.Router();

// Placeholder search routes
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Search not implemented yet' });
});

router.get('/global', (req, res) => {
  res.status(501).json({ error: 'Search not implemented yet' });
});

export default router;
