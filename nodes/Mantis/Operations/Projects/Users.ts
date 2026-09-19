import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Projects/Project Users',
	value: 'mantisProjectUsersVerb',
};

export const enum Operations {
	GetProjectUsers = 'getProjectUsers',
	GetProjectUsersThatCanBeAssignedIssues = 'getProjectUsersThatCanBeAssignedIssues',
	ProjectAddOrUpdateUser = 'projectAddOrUpdateUser',
	ProjectDeleteUser = 'projectDeleteUser',
}

const accessLevelOptions = [
	'viewer',
	'reporter',
	'updater',
	'developer',
	'manager',
	'administrator',
].map((v) => ({ name: v, value: v }));

export const fields: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		default: null,
		description: 'ID of the user to add/update (provide ID or Username)',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.ProjectAddOrUpdateUser],
			},
		},
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		description: 'Username (used when User ID is empty)',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.ProjectAddOrUpdateUser],
			},
		},
	},
	{
		displayName: 'Access Level',
		name: 'accessLevel',
		type: 'options',
		options: accessLevelOptions,
		default: 'developer',
		required: true,
		description: 'Project-specific access level for the user (required by the API)',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.ProjectAddOrUpdateUser],
			},
		},
	},
	{
		displayName: 'Minimum Access Level',
		name: 'minAccessLevel',
		type: 'options',
		// Query param "access_level" is cast to int server-side, so values are numeric strings
		options: [
			{ name: 'All Levels (No Filter)', value: '' },
			{ name: 'Viewer (10)', value: '10' },
			{ name: 'Reporter (25)', value: '25' },
			{ name: 'Updater (40)', value: '40' },
			{ name: 'Developer (55)', value: '55' },
			{ name: 'Manager (70)', value: '70' },
			{ name: 'Administrator (90)', value: '90' },
		],
		default: '',
		description: 'Only return users whose access level is at or above this value',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.GetProjectUsers],
			},
		},
	},
	{
		displayName: 'Include Access Levels',
		name: 'includeAccessLevels',
		type: 'boolean',
		default: true,
		description: "Whether to include each user's access level information in the response",
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [
					Operations.GetProjectUsers,
					Operations.GetProjectUsersThatCanBeAssignedIssues,
				],
			},
		},
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
				name: 'Get Project Users',
				value: 'getProjectUsers',
				action: 'Get project users',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}/users',
						qs: {
							access_level: '={{ $parameter.minAccessLevel || undefined }}',
							include_access_levels: '={{ $parameter.includeAccessLevels ? 1 : 0 }}',
						},
					},
					output: {
						postReceive: [
							{
								// API returns {"users":[...]} - unwrap to one item per user
								type: 'rootProperty',
								properties: { property: 'users' },
							},
						],
					},
				},
			},
			{
				name: 'Get Assignable Users (Handlers)',
				value: 'getProjectUsersThatCanBeAssignedIssues',
				action: 'Get users that can be assigned issues',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}/handlers',
						qs: {
							// handlers endpoint fixes access_level server-side (DEVELOPER)
							include_access_levels: '={{ $parameter.includeAccessLevels ? 1 : 0 }}',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'users' },
							},
						],
					},
				},
			},
			{
				name: 'Add or Update a Project User',
				value: 'projectAddOrUpdateUser',
				action: 'Add or update a project user',
				description:
					'Add a user to the project, or update their project-specific access level if already a member',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ $parameter.projectId }}/users',
						body: {
							user: '={{ $parameter.userId ? { id: $parameter.userId } : ($parameter.username ? { name: $parameter.username } : undefined) }}',
							access_level: '={{ { name: $parameter.accessLevel } }}',
						},
					},
				},
			},
		],
		default: 'getProjectUsers',
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
