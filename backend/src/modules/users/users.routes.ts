import { Router } from 'express';
import { authorize } from '../../middleware/auth';
import { getQuery, validate } from '../../middleware/validate';
import { idParam } from '../../lib/access';
import { createUserSchema, listUsersQuery, updateUserSchema, type ListUsersQuery } from './users.schema';
import * as usersService from './users.service';

const router = Router();

// Managers can read the user list (to assign owners); only admins can modify it.
router.get('/', authorize('ADMIN', 'MANAGER'), validate({ query: listUsersQuery }), async (req, res) => {
  res.json({ data: await usersService.listUsers(getQuery<ListUsersQuery>(req)) });
});

router.post('/', authorize('ADMIN'), validate({ body: createUserSchema }), async (req, res) => {
  res.status(201).json({ data: await usersService.createUser(req.body) });
});

router.patch(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, body: updateUserSchema }),
  async (req, res) => {
    res.json({ data: await usersService.updateUser(req.user!.id, req.params.id as string, req.body) });
  },
);

export default router;
