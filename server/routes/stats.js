import express from 'express';

const router = express.Router();

// Placeholder stats routes
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Statistics not implemented yet' });
});

router.get('/performance', (req, res) => {
  res.status(501).json({ error: 'Statistics not implemented yet' });
});

export default router;
