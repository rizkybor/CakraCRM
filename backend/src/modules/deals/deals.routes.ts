import { Router } from 'express';
import { authorize } from '../../middleware/auth';
import { getQuery, validate } from '../../middleware/validate';
import { idParam } from '../../lib/access';
import {
  createDealSchema,
  listDealsQuery,
  updateDealSchema,
  updateStageSchema,
  type ListDealsQuery,
} from './deals.schema';
import * as dealsService from './deals.service';

const router = Router();

router.get('/', validate({ query: listDealsQuery }), async (req, res) => {
  res.json({ data: await dealsService.listDeals(req.user!, getQuery<ListDealsQuery>(req)) });
});

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  res.json({ data: await dealsService.getDeal(req.user!, req.params.id as string) });
});

router.post('/', validate({ body: createDealSchema }), async (req, res) => {
  res.status(201).json({ data: await dealsService.createDeal(req.user!, req.body) });
});

router.patch('/:id', validate({ params: idParam, body: updateDealSchema }), async (req, res) => {
  res.json({ data: await dealsService.updateDeal(req.user!, req.params.id as string, req.body) });
});

router.patch('/:id/stage', validate({ params: idParam, body: updateStageSchema }), async (req, res) => {
  res.json({ data: await dealsService.updateStage(req.user!, req.params.id as string, req.body.stage) });
});

router.delete('/:id', authorize('ADMIN', 'MANAGER'), validate({ params: idParam }), async (req, res) => {
  await dealsService.deleteDeal(req.user!, req.params.id as string);
  res.status(204).end();
});

export default router;
