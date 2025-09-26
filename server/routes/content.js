import express from 'express';

const router = express.Router();

// Placeholder content routes
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Content management not implemented yet' });
});

router.get('/:id', (req, res) => {
  res.status(501).json({ error: 'Content management not implemented yet' });
});

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Content management not implemented yet' });
});

router.put('/:id', (req, res) => {
  res.status(501).json({ error: 'Content management not implemented yet' });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({ error: 'Content management not implemented yet' });
});

export default router;
