import { auth, Primate } from '@thewebchimp/primate';
import UserController from './user.controller.js';
const router = Primate.getRouter();

// Functions -----------------------------------------------------------------------------------------------------------

// me
router.get('/me', auth, UserController.me);

router.put('/:id/profile', auth, UserController.updateProfile);

// google login
router.get('/google/redirect', UserController.googleRedirect);
router.post('/google/authenticate', UserController.googleAuth);

// get user avatar
router.get('/:id/avatar', UserController.avatar);

// get agents
router.get('/:id/agents',auth, UserController.getAgents);

// create new agent
router.post('/:id/agents', auth, UserController.createAgent);

// get agent
router.get('/:id/agents/:idAgent', auth, UserController.getAgent);

// update agent
router.put('/:id/agents/:idAgent', auth, UserController.updateAgent);

// init a chat
router.post('/:id/chat', auth, UserController.initChat);

// create agent entity
router.post('/:id/agents/:idAgent/entities', auth, UserController.createEntity);

// ---------------------------------------------------------------------------------------------------------------------

Primate.setupRoute('user', router, {
	searchField: [ 'username' ],
	queryableFields: [ 'nicename', 'email' ],
});
export { router };