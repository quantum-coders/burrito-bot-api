import primate, { jwt, PrimateService } from '@thewebchimp/primate';
import bcrypt from 'bcrypt';

class UserService {

	/**
	 * Find a user by email
	 * @param {string} email - The email of the user to find.
	 * @returns {Promise<User>} - A promise that resolves to the user object.
	 */
	static async findByEmail(email) {
		return PrimateService.findBy('user', { username: email });
	}

	/**
	 * Creates a new user with the given data.
	 *
	 * @param {Object} data - The data for the new user.
	 * @returns {Promise<Object>} - A promise that resolves to the created user object.
	 */
	static async create(data) {
		try {
			// Business Logic

			if(data.password) data.password = bcrypt.hashSync(data.password, 8);

			// if we receive username or email, we use one as the other
			if(data.username && !data.email) data.email = data.username;
			else if(data.email && !data.username) data.username = data.email;

			// If we receive firstname or lastname, we use them to create nicename
			if(data.firstname && data.lastname) data.nicename = data.firstname + ' ' + data.lastname;

			// Primate Create
			return PrimateService.create('user', data);
		} catch(e) {
			throw e;
		}
	}

	/**
	 * Updates a user with the given data.
	 *
	 * @param {number} id - The ID of the user to update.
	 * @param {Object} data - The data to update the user with.
	 * @param {Object} [options={}] - Additional options for updating the user.
	 * @returns {Promise<Object>} - A promise that resolves to the updated user object.
	 */
	static async update(id, data, options = {}) {

		if(data.password) data.password = bcrypt.hashSync(data.password, 8);
		else delete data.password;

		return PrimateService.update('user', id, data);
	}

	/**
	 * Retrieves the agents associated with a user by their ID.
	 *
	 * @param {number} id - The ID of the user whose agents are to be retrieved.
	 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of agent objects.
	 */
	static async getAgents(id) {
		return primate.prisma.agent.findMany({
			where: {
				idUser: id,
			},
		});
	}

	/**
	 * Creates a new agent associated with a user by their ID.
	 *
	 * @param {number} id - The ID of the user to associate the new agent with.
	 * @param {Object} data - The data for the new agent.
	 * @returns {Promise<Object>} - A promise that resolves to the created agent object.
	 */
	static async createAgent(id, data) {
		return primate.prisma.agent.create({
			data: {
				...data,
				idUser: id,
			},
		});
	}

	/**
	 * Updates a specific agent associated with a user by their ID and agent ID.
	 *
	 * @param {number} id - The ID of the user whose agent is to be updated.
	 * @param {number} idAgent - The ID of the agent to be updated.
	 * @param {Object} data - The data to update the agent with.
	 * @returns {Promise<Object>} - A promise that resolves to the updated agent object.
	 */
	static async updateAgent(id, idAgent, data) {
		return primate.prisma.agent.update({
			where: {
				id: idAgent,
			},
			data: data,
		});
	}

	/**
	 * Retrieves a specific agent associated with a user by their ID and agent ID.
	 *
	 * @param {number} id - The ID of the user whose agent is to be retrieved.
	 * @param {number} idAgent - The ID of the agent to be retrieved.
	 * @returns {Promise<Object>} - A promise that resolves to the agent object.
	 */
	static async getAgent(id, idAgent) {
		return primate.prisma.agent.findFirst({
			where: {
				idUser: id,
				id: idAgent,
			},
			include: {
				entities: true,
			},
		});
	}

	/**
	 * Creates a new entity associated with a specific agent by their ID and agent ID.
	 *
	 * @param {number} id - The ID of the user to associate the new entity with.
	 * @param {number} idAgent - The ID of the agent to associate the new entity with.
	 * @param {Object} data - The data for the new entity.
	 * @returns {Promise<Object>} - A promise that resolves to the created entity object.
	 */
	static async createEntity(id, idAgent, data) {
		return primate.prisma.entity.create({
			data: {
				...data,
				idAgent,
			},
		});
	}
}

export default UserService;