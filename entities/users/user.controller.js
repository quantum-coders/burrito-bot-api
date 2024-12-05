import primate, {PrimateService, PrimateController, jwt} from '@thewebchimp/primate';
import UserService from '#entities/users/user.service.js';
import queryString from 'query-string';
import axios from 'axios';

class UserController extends PrimateController {

	static async authenticate(req, res, next) {
		try {
			const {wallet} = req.body;
			let message = 'User authenticated successfully';

			// check for valid wallet address with regex
			if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
				return res.respond({
					status: 400,
					message: 'Error: Invalid wallet address',
				});
			}

			let user = await UserService.findByWallet(wallet);

			if (!user) {
				user = await primate.prisma.user.create({
					data: {
						wallet,
						type: 'User',
						email: wallet,
						username: wallet,
						status: 'Active',
						password: '',
					}
				});

				message = 'User created successfully';
			}

			// Firmar un JWT para el usuario
			const token = await jwt.signAccessToken(user);

			return res.respond({
				data: user,
				props: {token},
				message,
			});
		} catch (e) {

			console.log(e);

			return res.respond({
				status: 400,
				message: 'Error creating user: ' + e.message,
			});
		}
	};


	/**
	 * Updates a user's profile with the given data.
	 *
	 * This method checks if the user ID in the request parameters is 'me' and replaces it with the authenticated user's ID if necessary.
	 * It then calls the UserService to update the user's data in the database and sends the updated user data in the response.
	 * If any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the user ID in the parameters and the data to update the user with.
	 * @param {Object} res - The response object used to send back the updated user data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the user's profile has been updated and the response has been sent.
	 * @throws {Error} - Throws an error if the user ID is 'me' and the authenticated user's ID is not available, or if there is an issue updating the user.
	 */
	static async updateProfile(req, res) {
		try {
			const idUser = req.params.id;

			if (idUser === 'me') {
				if (!req.user || !req.user.payload || !req.user.payload.id) {
					return res.respond({status: 401, message: 'Unauthorized'});
				}
				req.params.id = req.user.payload.id;
			}

			const user = await UserService.update(req.params.id, req.body);

			return res.respond({
				data: user,
				message: 'User updated successfully',
			});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'User update error: ' + e.message});
		}
	}

	/**
	 * Retrieves the authenticated user's information.
	 *
	 * This method checks for the presence of an authenticated user in the request object.
	 * If the user is authenticated, it fetches the user data from the database, removes
	 * the password for security, and sends the user data in the response. If the user is
	 * not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {void}
	 */
	static async me(req, res) {
		try {
			if (!req.user || !req.user.payload || !req.user.payload.id) {
				return res.respond({status: 401, message: 'Unauthorized'});
			}

			// Get user from req
			const signedUser = req.user.payload;

			/** @type {User} */
			const user = await PrimateService.findById('user', signedUser.id);

			if (!user) {
				return res.respond({status: 404, message: 'User not found'});
			}

			// delete password
			delete user.password;

			return res.respond({
				data: user,
				message: 'User retrieved successfully',
			});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'User me error: ' + e.message});
		}
	};

	/**
	 * Redirects the user to the Google OAuth2 authorization endpoint.
	 *
	 * This method constructs the Google OAuth2 authorization URL with the necessary query parameters
	 * and redirects the user to this URL to initiate the OAuth2 authentication flow.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {void}
	 */
	static async googleRedirect(req, res) {
		const params = queryString.stringify({
			client_id: process.env.GOOGLE_CLIENT_ID,
			redirect_uri: process.env.GOOGLE_REDIRECT_URI,
			scope: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
			].join(' '), // space seperated string
			response_type: 'code',
			access_type: 'offline',
			prompt: 'consent',
		});

		const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

		res.redirect(googleLoginUrl);
	};

	/**
	 * Handles Google OAuth2 authentication.
	 *
	 * This method receives an authorization code from the request body, exchanges it for an access token,
	 * retrieves the user's information from Google, and checks if the user exists in the system. If the user
	 * exists and is active, it generates an access token for the user and responds with the user data and
	 * access token. If the user does not exist or is not active, it responds with an appropriate error message.
	 *
	 * @param {Object} req - The request object containing the authorization code in the body.
	 * @param {Object} res - The response object used to send back the user data with access token or error message.
	 * @returns {void}
	 * @throws {Error} - Throws an error if something goes wrong during the authentication process.
	 */
	static async googleAuth(req, res) {
		// Get the code from body
		const code = req.body.code;

		if (code) {

			let token;

			try {
				// post to google
				token = await axios.post('https://oauth2.googleapis.com/token', {
					client_id: process.env.GOOGLE_CLIENT_ID,
					client_secret: process.env.GOOGLE_CLIENT_SECRET,
					redirect_uri: process.env.GOOGLE_REDIRECT_URI,
					grant_type: 'authorization_code',
					code,
				});
			} catch (e) {
				console.error(e);
				return res.respond({
					status: 400,
					result: 'error',
					message: 'Error getting token',
				});
			}

			const accessToken = token.data.access_token;
			let userInfo;

			try {

				// get user info
				userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});
			} catch (e) {
				console.error(e);
				return res.respond({
					status: 400,
					result: 'error',
					message: 'Error getting user info',
				});
			}

			// Check if user exists
			let user = await UserService.findByEmail(userInfo.data.email);

			// If the user does not exist, create the user
			if (!user) {
				user = await UserService.create({
					email: userInfo.data.email,
					username: userInfo.data.email,
					firstname: userInfo.data.given_name,
					lastname: userInfo.data.family_name,
					type: 'User',
					status: 'Active',
				});
			}

			// If user exists
			if (user) {
				// If the user is not active
				if (user.status !== 'Active') {
					return res.respond({
						status: 401,
						result: 'error',
						message: 'User is not active',
					});
				} else {
					const accessToken = await jwt.signAccessToken(user);

					return res.respond({
						data: user,
						message: 'Account login successful',
						props: {
							accessToken,
						},
					});
				}
			} else {
				return res.respond({
					status: 404,
					result: 'error',
					message: 'User not found',
				});
			}

		} else {
			return res.respond({
				status: 400,
				message: 'Invalid request',
			});
		}
	};

	/**
	 * Returns the avatar image for a user if it exists, or generates an avatar based on the user's first name and last name.
	 *
	 * This method retrieves the user's avatar from the database if it exists. If the avatar does not exist, it generates
	 * an avatar using the user's initials and returns it. The method also supports query parameters for customizing the
	 * avatar's appearance, such as size, width, height, boldness, background color, text color, font size, border, and
	 * the number of characters to display.
	 *
	 * @param {Object} req - The request object containing the user ID in the parameters and optional query parameters for avatar customization.
	 * @param {Object} res - The response object used to send back the avatar image or redirect to the generated avatar URL.
	 * @returns {void}
	 * @throws {Error} - Throws an error if the user ID is not provided or if there is an issue retrieving the user or avatar.
	 */
	static async avatar(req, res) {

		if (!req.params.id) throw new Error('No user id provided');

		// Get query params for width and height
		const {
			size = 128,
			width = 128,
			height = 128,
			bold = true,
			background = 'FFFFFF',
			color = '000000',
			fontSize = 64,
			border = 2,
			chars = 2,
			mode = 'light',
		} = req.query;

		// Set options
		const options = {size, width, height, bold, background, color, fontSize, border, chars};

		if (mode === 'dark') {
			options.background = '000000';
			options.color = 'FFFFFF';
		}

		// covert options to query string
		const query = queryString.stringify(options);

		try {

			/** @type {User} */
			const user = await PrimateService.findById('user', req.params.id);
			let attachment;

			// check if we got user.metas.idAvatar
			if (user.metas?.idAvatar) {
				// get the attachment
				try {

					/** @type {Attachment} */
					attachment = await PrimateService.findById('attachment', user.metas.idAvatar);

				} catch (e) {
					console.error('Error getting attachment:', e);
				}
			}

			// if we have an attachment, return the location of the attachment
			if (attachment && attachment.metas?.location) {

				res.redirect(attachment.metas.location);

			} else {

				// Get initials
				let initials = user.firstname + ' ' + user.lastname;

				// Trim initials
				initials = initials.trim();

				// if the initials are empty, use username
				if (!initials) initials = user.username;

				// if still empty, use NA
				if (!initials) initials = 'NA';

				res.redirect(`https://ui-avatars.com/api/?name=${initials}&${query}`);
			}
		} catch (e) {

			console.error('Error getting avatar, using fallback:', e);
			res.redirect(`https://ui-avatars.com/api/?name=NA&${query}`);
		}
	};

	/**
	 * Retrieves the agents associated with the authenticated user.
	 *
	 * This method validates the authenticated user from the request object.
	 * If the user is authenticated, it fetches the agents associated with the user
	 * from the database and sends them in the response. If the user is not authenticated
	 * or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information.
	 * @param {Object} res - The response object used to send back the agents data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the agents data has been retrieved and the response has been sent.
	 * @throws {Error} - Throws an error if there is an issue fetching the agents.
	 */
	static async getAgents(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'});

		try {
			const agents = await UserService.getAgents(user.id);
			return res.respond({data: agents, message: 'Agents retrieved successfully'});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error getting agents: ' + e.message});
		}
	}

	/**
	 * Validates the authenticated user from the request object.
	 *
	 * This method retrieves the authenticated user's information from the request object,
	 * fetches the user data from the database, removes the password for security, and returns
	 * the user data. If the user is not authenticated or if any error occurs, it returns false.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information.
	 * @returns {Promise<User|boolean>} - A promise that resolves to the user object without the password, or false if the user is not authenticated or not found.
	 */
	static async validateMe(req) {
		const signedUser = req.user.payload;

		/** @type {User} */
		const user = await PrimateService.findById('user', signedUser.id);
		if (!user) return false;

		// delete password
		delete user.password;
		return user;
	}

	// In UserController.js

	static async getChat(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) {
			return res.respond({status: 401, message: 'User not found or error fetching user'});
		}

		try {
			const idChat = req.params.idChat;
			console.log('Received idChat:', idChat);

			if (!idChat) {
				return res.respond({status: 400, message: 'No chat ID provided'});
			}

			// Buscar el chat por UID en lugar de ID numérico
			const chat = await PrimateService.findBy('chat', {uid: idChat, idUser: user.id});
			if (!chat) {
				return res.respond({status: 404, message: 'Chat not found'});
			}

			// Buscar el thread asociado al chat
			const thread = await PrimateService.findBy('thread', {idChat: chat.id});
			if (!thread) {
				return res.respond({status: 404, message: 'Thread not found'});
			}

			// Obtener todos los mensajes del thread
			const messagesResult = await PrimateService.all('message', {idThread: thread.id});
			thread.messages = messagesResult.data;

			// Ordenar los mensajes del más antiguo al más reciente
			thread.messages.sort((a, b) => new Date(a.created) - new Date(b.created));

			return res.respond({
				data: {
					chat,
					thread,
				},
				message: 'Chat retrieved successfully',
			});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error retrieving chat: ' + e.message});
		}
	}

	/**
	 * Creates a new agent associated with a user by their ID.
	 *
	 * This method validates the authenticated user from the request object.
	 * If the user is authenticated, it calls the UserService to create a new agent
	 * associated with the user's ID and sends the created agent data in the response.
	 * If the user is not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information and the data for the new agent.
	 * @param {Object} res - The response object used to send back the created agent data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the agent has been created and the response has been sent.
	 * @throws {Error} - Throws an error if there is an issue creating the agent.
	 */
	static async createAgent(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'});

		try {
			const agent = await UserService.createAgent(user.id, req.body);
			return res.respond({data: agent, message: 'Agent created successfully'});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error creating agent: ' + e.message});
		}
	}

	/**
	 * Retrieves a specific agent associated with the authenticated user by agent ID.
	 *
	 * This method validates the authenticated user from the request object.
	 * If the user is authenticated, it calls the UserService to fetch the agent
	 * associated with the user's ID and the provided agent ID, and sends the agent data in the response.
	 * If the user is not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information and the agent ID in the parameters.
	 * @param {Object} res - The response object used to send back the agent data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the agent data has been retrieved and the response has been sent.
	 * @throws {Error} - Throws an error if there is an issue retrieving the agent.
	 */
	static async getAgent(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'});

		try {
			const agent = await UserService.getAgent(user.id, parseInt(req.params.idAgent));
			return res.respond({data: agent, message: 'Agent retrieved successfully'});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error getting agent: ' + e.message});
		}
	}

	/**
	 * Initiates a chat for the authenticated user.
	 *
	 * This method validates the authenticated user from the request object.
	 * If the user is authenticated, it checks if a chat exists for the user.
	 * If a chat does not exist, it creates a new chat. It then creates a thread
	 * for the chat or retrieves the existing thread. Finally, it retrieves all
	 * messages for the thread and sends the chat and thread data in the response.
	 * If the user is not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information.
	 * @param {Object} res - The response object used to send back the chat and thread data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the chat has been initiated and the response has been sent.
	 * @throws {Error} - Throws an error if there is an issue initiating the chat.
	 */
	static async initChat(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'});

		try {
			// Siempre crear un nuevo chat
			const chat = await PrimateService.create('chat', {idUser: user.id});

			// Crear un nuevo thread para el chat
			const thread = await PrimateService.create('thread', {idChat: chat.id, idUser: user.id});

			// Inicializar mensajes vacíos para el nuevo thread
			thread.messages = [];

			return res.respond({
				data: {
					chat,
					thread,
				},
				message: 'Chat initiated successfully',
			});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error initiating chat: ' + e.message});
		}
	}


	/**
	 * Updates a specific agent associated with the authenticated user by agent ID.
	 *
	 * This method validates the authenticated user from the request object.
	 * If the user is authenticated, it calls the UserService to update the agent
	 * associated with the user's ID and the provided agent ID, and sends the updated agent data in the response.
	 * If the user is not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information and the data for the agent update.
	 * @param {Object} res - The response object used to send back the updated agent data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the agent has been updated and the response has been sent.
	 * @throws {Error} - Throws an error if there is an issue updating the agent.
	 */
	static async updateAgent(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'});

		const idAgent = parseInt(req.params.idAgent);
		if (!idAgent) return res.respond({status: 400, message: 'No agent ID provided'});
		if (!req.body) return res.respond({status: 400, message: 'No data provided'});

		try {
			const agent = await UserService.updateAgent(user.id, idAgent, req.body);
			return res.respond({data: agent, message: 'Agent updated successfully'});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error updating agent: ' + e.message});
		}
	}

	/**
	 * Creates a new entity associated with a specific agent by their ID.
	 *
	 * This method validates the authenticated user from the request object.
	 * If the user is authenticated, it calls the UserService to create a new entity
	 * associated with the user's ID and the provided agent ID, and sends the created entity data in the response.
	 * If the user is not authenticated or if any error occurs, it sends the appropriate error response.
	 *
	 * @param {Object} req - The request object containing the authenticated user's information and the data for the new entity.
	 * @param {Object} res - The response object used to send back the created entity data or an error message.
	 * @returns {Promise<void>} - A promise that resolves when the entity has been created and the response has been sent.
	 * @throws {Error} - Throws an error if there is an issue creating the entity.
	 */
	static async createEntity(req, res) {
		const user = await UserController.validateMe(req);
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'});

		const idAgent = parseInt(req.params.idAgent);
		if (!idAgent) return res.respond({status: 400, message: 'No agent ID provided'});
		if (!req.body) return res.respond({status: 400, message: 'No data provided'});

		try {
			const entity = await UserService.createEntity(user.id, idAgent, req.body);
			return res.respond({data: entity, message: 'Entity created successfully'});

		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: 'Error creating entity: ' + e.message});
		}
	}

	// user.controller.js

	static async getChats(req, res) {
		const user = await UserController.validateMe(req)
		if (!user) return res.respond({status: 401, message: 'User not found or error fetching user'})

		try {
			// Obtener todos los chats del usuario
			const chatsResult = await PrimateService.all('chat', {idUser: user.id})
			const chats = chatsResult.data

			return res.respond({
				data: {chats},
				message: 'Chats retrieved successfully',
			})
		} catch (e) {
			console.error(e)
			return res.respond({status: 400, message: 'Error retrieving chats: ' + e.message})
		}
	}

}

export default UserController;
