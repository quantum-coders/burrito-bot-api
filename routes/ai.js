import { auth, Primate } from '@thewebchimp/primate';
import AIController from '../controllers/ai.controller.js';
const router = Primate.getRouter();

router.post('/message', AIController.message);

router.post('/message/paige', auth, AIController.paigeMessage);

export { router };