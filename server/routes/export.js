import express from 'express';

const router = express.Router();

// Placeholder export routes
router.get('/:type', (req, res) => {
  res.status(501).json({ error: 'Export not implemented yet' });
});

router.post('/:type', (req, res) => {
  res.status(501).json({ error: 'Export not implemented yet' });
});

export default router;
