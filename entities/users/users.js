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

// init a chat
router.post('/:id/chat', auth, UserController.initChat);
router.post('/authenticate', UserController.authenticate);
// In your router file
router.get('/me/chats', auth, UserController.getChats)

router.get('/chat/:idChat', auth, UserController.getChat);

// ---------------------------------------------------------------------------------------------------------------------

Primate.setupRoute('user', router, {
	searchField: [ 'username' ],
	queryableFields: [ 'nicename', 'email' ],
});
export { router };
