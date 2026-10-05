import { Router } from 'express';
import { getQuery, validate } from '../../middleware/validate';
import { idParam } from '../../lib/access';
import {
  createActivitySchema,
  listActivitiesQuery,
  updateActivitySchema,
  type ListActivitiesQuery,
} from './activities.schema';
import * as activitiesService from './activities.service';

const router = Router();

router.get('/', validate({ query: listActivitiesQuery }), async (req, res) => {
  res.json(await activitiesService.listActivities(req.user!, getQuery<ListActivitiesQuery>(req)));
});

router.post('/', validate({ body: createActivitySchema }), async (req, res) => {
  res.status(201).json({ data: await activitiesService.createActivity(req.user!, req.body) });
});

router.patch('/:id', validate({ params: idParam, body: updateActivitySchema }), async (req, res) => {
  res.json({ data: await activitiesService.updateActivity(req.user!, req.params.id as string, req.body) });
});

router.delete('/:id', validate({ params: idParam }), async (req, res) => {
  await activitiesService.deleteActivity(req.user!, req.params.id as string);
  res.status(204).end();
});

export default router;
