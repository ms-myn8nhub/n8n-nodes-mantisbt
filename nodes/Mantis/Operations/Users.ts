import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Users',
	value: 'mantisUsersVerb',
};

export const enum Operations {
	GetMyUserInfo = 'getMyUserInfo',
	GetMyUserInfoSelect = 'getMyUserInfoSelect',
	GetUserById = 'getUserById',
	GetUserByIdSelect = 'getUserByIdSelect',
	GetUserByUsername = 'getUserByUsername',
	CreateUser = 'createUser',
	CreateUserMinimal = 'createUserMinimal',
	UpdateUser = 'updateUser',
	ResetUserPassword = 'resetUserPassword',
	DeleteUser = 'deleteUser',
}

const showFor = (operations: string[]) => ({
	show: {
		resource: [resource.value],
		operation: operations,
	},
});

const accessLevelOptions = [
	'viewer',
	'reporter',
	'updater',
	'developer',
	'manager',
	'administrator',
].map((v) => ({ name: v, value: v }));

const triStateOptions = [
	{ name: 'Do Not Change', value: '' },
	{ name: 'Yes', value: 'true' },
	{ name: 'No', value: 'false' },
];

export const fields: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		default: null,
		required: true,
		description: 'ID of the user',
		displayOptions: showFor([Operations.GetUserById, Operations.UpdateUser]),
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor([Operations.GetUserByUsername, Operations.CreateUser]),
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		description: 'New username (leave empty to keep current)',
		displayOptions: showFor([Operations.UpdateUser]),
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description: 'Set a password (on create: required unless the instance sends reset emails)',
		displayOptions: showFor([Operations.CreateUser, Operations.UpdateUser]),
	},
	{
		displayName: 'Real Name',
		name: 'realName',
		type: 'string',
		default: '',
		displayOptions: showFor([Operations.CreateUser, Operations.UpdateUser]),
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@example.com',
		default: '',
		displayOptions: showFor([Operations.CreateUser, Operations.UpdateUser]),
	},
	{
		displayName: 'Access Level',
		name: 'accessLevel',
		type: 'options',
		options: [{ name: 'Do Not Set', value: '' }, ...accessLevelOptions],
		default: '',
		description: 'Global access level (instance default if not set)',
		displayOptions: showFor([Operations.CreateUser, Operations.UpdateUser]),
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		displayOptions: showFor([Operations.CreateUser]),
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'options',
		options: triStateOptions,
		default: '',
		displayOptions: showFor([Operations.UpdateUser]),
	},
	{
		displayName: 'Protected',
		name: 'protected',
		type: 'boolean',
		default: false,
		description: 'Protected users cannot be deleted or have their accounts modified',
		displayOptions: showFor([Operations.CreateUser]),
	},
	{
		displayName: 'Protected',
		name: 'protected',
		type: 'options',
		options: triStateOptions,
		default: '',
		displayOptions: showFor([Operations.UpdateUser]),
	},
];

export const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [resource.value],
			},
		},
		options: [
			{
				name: 'Get My User Info',
				value: 'getMyUserInfo',
				action: 'Get my user info',
				routing: {
					request: {
						method: 'GET',
						url: '/users/me',
						qs: {
							// MantisBT reads the query param "select" (not "select_fields")
							select: '={{ $parameter.selectFields || undefined }}',
						},
					},
					// Note: /users/me returns a flat user object - no rootProperty unwrapping
				},
			},
			{
				name: 'Get User By ID',
				value: 'getUserById',
				action: 'Get user by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/users/{{ $parameter.userId }}',
						qs: {
							select: '={{ $parameter.selectFields || undefined }}',
						},
					},
					output: {
						postReceive: [
							{
								// API returns {"users":[user]} - unwrap to one item per user
								type: 'rootProperty',
								properties: { property: 'users' },
							},
						],
					},
				},
			},
			{
				name: 'Get User By Username',
				value: 'getUserByUsername',
				action: 'Get user by username',
				routing: {
					request: {
						method: 'GET',
						url: '=/users/username/{{ $parameter.username }}',
						qs: {
							select: '={{ $parameter.selectFields || undefined }}',
						},
					},
					output: {
						postReceive: [
							{
								// API returns {"users":[user]} - unwrap to one item per user
								type: 'rootProperty',
								properties: { property: 'users' },
							},
						],
					},
				},
			},
			{
				name: 'Create a User',
				value: 'createUser',
				action: 'Create a user',
				routing: {
					request: {
						method: 'POST',
						url: '/users/',
						body: {
							username: '={{ $parameter.username }}',
							password: '={{ $parameter.password || undefined }}',
							real_name: '={{ $parameter.realName || undefined }}',
							email: '={{ $parameter.email || undefined }}',
							access_level:
								'={{ $parameter.accessLevel ? { name: $parameter.accessLevel } : undefined }}',
							enabled: '={{ $parameter.enabled }}',
							protected: '={{ $parameter.protected }}',
						},
					},
				},
			},
			{
				name: 'Update a User',
				value: 'updateUser',
				action: 'Update a user',
				description: 'Update a user (only filled-in fields are changed)',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/users/{{ $parameter.userId }}',
						body: {
							username: '={{ $parameter.username || undefined }}',
							password: '={{ $parameter.password || undefined }}',
							real_name: '={{ $parameter.realName || undefined }}',
							email: '={{ $parameter.email || undefined }}',
							access_level:
								'={{ $parameter.accessLevel ? { name: $parameter.accessLevel } : undefined }}',
							enabled:
								'={{ $parameter.enabled === "true" ? true : ($parameter.enabled === "false" ? false : undefined) }}',
							protected:
								'={{ $parameter.protected === "true" ? true : ($parameter.protected === "false" ? false : undefined) }}',
						},
					},
				},
			},
		],
		default: 'getMyUserInfo',
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
