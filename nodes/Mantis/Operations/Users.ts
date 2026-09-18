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

const accessLevelOptions = [
	'viewer',
	'reporter',
	'updater',
	'developer',
	'manager',
	'administrator',
].map((v) => ({ name: v, value: v }));

const selectFieldsOption: INodeProperties = {
	displayName: 'Select Fields',
	name: 'selectFields',
	type: 'string',
	default: '',
	placeholder: 'id,name,real_name,email,access_level',
	description: 'Comma-separated list of fields to select. Leave empty for all fields.',
};

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
				options: [selectFieldsOption],
				routing: {
					request: {
						method: 'GET',
						url: '/users/me',
						qs: {
							select_fields: '={{ $parameter.selectFields || "" }}',
						},
					},
				},
			},
			{
				name: 'Get User By ID',
				value: 'getUserById',
				action: 'Get user by ID',
				options: [
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'number',
						default: null,
						description: 'ID of the user to retrieve',
					},
					selectFieldsOption,
				],
				routing: {
					request: {
						method: 'GET',
						url: '=/users/{{ $parameter.userId }}',
						qs: {
							select_fields: '={{ $parameter.selectFields || "" }}',
						},
					},
				},
			},
			{
				name: 'Get User By Username',
				value: 'getUserByUsername',
				action: 'Get user by username',
				options: [
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						description: 'Username of the user to retrieve',
					},
					selectFieldsOption,
				],
				routing: {
					request: {
						method: 'GET',
						url: '=/users/username/{{ $parameter.username }}',
						qs: {
							select_fields: '={{ $parameter.selectFields || "" }}',
						},
					},
				},
			},
			{
				name: 'Create a User',
				value: 'createUser',
				action: 'Create a user',
				options: [
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: {
							password: true,
						},
						default: '',
						description: 'Initial password (required unless the instance sends reset emails)',
					},
					{
						displayName: 'Real Name',
						name: 'realName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@example.com',
						default: '',
					},
					{
						displayName: 'Access Level',
						name: 'accessLevel',
						type: 'options',
						options: [{ name: 'Do Not Set', value: '' }, ...accessLevelOptions],
						default: '',
						description: 'Global access level (instance default if not set)',
					},
					{
						displayName: 'Enabled',
						name: 'enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Protected',
						name: 'protected',
						type: 'boolean',
						default: false,
						description: 'Protected users cannot be deleted or have their accounts modified',
					},
				],
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
				options: [
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'number',
						default: null,
						required: true,
						description: 'ID of the user to update',
					},
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						description: 'New username (leave empty to keep current)',
					},
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: {
							password: true,
						},
						default: '',
						description: 'Set a new password (leave empty to keep current)',
					},
					{
						displayName: 'Real Name',
						name: 'realName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@example.com',
						default: '',
					},
					{
						displayName: 'Access Level',
						name: 'accessLevel',
						type: 'options',
						options: [{ name: 'Do Not Change', value: '' }, ...accessLevelOptions],
						default: '',
					},
					{
						displayName: 'Enabled',
						name: 'enabled',
						type: 'options',
						options: [
							{ name: 'Do Not Change', value: '' },
							{ name: 'Yes', value: 'true' },
							{ name: 'No', value: 'false' },
						],
						default: '',
					},
					{
						displayName: 'Protected',
						name: 'protected',
						type: 'options',
						options: [
							{ name: 'Do Not Change', value: '' },
							{ name: 'Yes', value: 'true' },
							{ name: 'No', value: 'false' },
						],
						default: '',
					},
				],
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
};
