import { Router } from 'express';
import { getSummary } from './dashboard.service';

const router = Router();

router.get('/summary', async (req, res) => {
  res.json({ data: await getSummary(req.user!) });
});

export default router;
