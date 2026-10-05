import { Router } from 'express';
import { authenticate } from './middleware/auth';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import leadsRoutes from './modules/leads/leads.routes';
import dealsRoutes from './modules/deals/deals.routes';
import activitiesRoutes from './modules/activities/activities.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);

// Everything below requires a valid access token.
router.use(authenticate);
router.use('/users', usersRoutes);
router.use('/leads', leadsRoutes);
router.use('/deals', dealsRoutes);
router.use('/activities', activitiesRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
