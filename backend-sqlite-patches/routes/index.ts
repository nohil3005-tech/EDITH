import { Router } from 'express';
import { authMiddleware, publicMiddleware, adminMiddleware } from '../middleware/auth';

import authRoutes        from './auth';
import adminRoutes       from './admin';
import dashboardRoutes   from './dashboard';
import freelanceRoutes   from './freelance';
import dropshippingRoutes from './dropshipping';
import paymentRoutes     from './payment';
import filesRoutes       from './files';
import agentsRoutes      from './agents';
import analyticsRoutes   from './analytics';
import marketplaceRoutes from './marketplace';
import referralsRoutes   from './referrals';
import clientPortalRoutes from './clientPortal';
import chatRoutes        from './chat';
import intelligenceRoutes from './intelligence';
import healthRoutes      from './health';
import platformRoutes    from './platform';
import platformsHubRoutes from './platformsHub';
import processorRoutes   from './processor';
import notificationRoutes from './notification';

const router = Router();

// ─── Public routes (no session/API key required) ──────────────
router.use('/health',        healthRoutes);
router.use('/client-portal', publicMiddleware, clientPortalRoutes);
router.use('/auth',          authRoutes);

// ─── Protected routes (Session/API key required) ──────────────
router.use(authMiddleware);

router.use('/admin',         adminMiddleware, adminRoutes);
router.use('/dashboard',     dashboardRoutes);
router.use('/freelance',     freelanceRoutes);
router.use('/dropshipping',  dropshippingRoutes);
router.use('/payment',       paymentRoutes);
router.use('/files',         filesRoutes);
router.use('/agents',        agentsRoutes);
router.use('/analytics',     analyticsRoutes);
router.use('/marketplace',   marketplaceRoutes);
router.use('/referrals',     referralsRoutes);
router.use('/chat',          chatRoutes);
router.use('/intelligence',  intelligenceRoutes);
router.use('/platform',      platformRoutes);
router.use('/platforms',     platformsHubRoutes);
router.use('/processor',     processorRoutes);
router.use('/notifications', notificationRoutes);

export default router;
