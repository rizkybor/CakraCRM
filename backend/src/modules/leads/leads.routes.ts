import { Router } from 'express';
import { authorize } from '../../middleware/auth';
import { getQuery, validate } from '../../middleware/validate';
import { idParam } from '../../lib/access';
import { createLeadSchema, listLeadsQuery, updateLeadSchema, type ListLeadsQuery } from './leads.schema';
import * as leadsService from './leads.service';

const router = Router();

router.get('/', validate({ query: listLeadsQuery }), async (req, res) => {
  res.json(await leadsService.listLeads(req.user!, getQuery<ListLeadsQuery>(req)));
});

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  res.json({ data: await leadsService.getLead(req.user!, req.params.id as string) });
});

router.post('/', validate({ body: createLeadSchema }), async (req, res) => {
  res.status(201).json({ data: await leadsService.createLead(req.user!, req.body) });
});

router.patch('/:id', validate({ params: idParam, body: updateLeadSchema }), async (req, res) => {
  res.json({ data: await leadsService.updateLead(req.user!, req.params.id as string, req.body) });
});

router.delete('/:id', authorize('ADMIN', 'MANAGER'), validate({ params: idParam }), async (req, res) => {
  await leadsService.deleteLead(req.user!, req.params.id as string);
  res.status(204).end();
});

export default router;
