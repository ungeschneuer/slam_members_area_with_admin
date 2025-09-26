import express from 'express';

const router = express.Router();

// Placeholder competition routes
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Competition management not implemented yet' });
});

router.get('/:id', (req, res) => {
  res.status(501).json({ error: 'Competition management not implemented yet' });
});

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Competition management not implemented yet' });
});

router.put('/:id', (req, res) => {
  res.status(501).json({ error: 'Competition management not implemented yet' });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({ error: 'Competition management not implemented yet' });
});

export default router;
