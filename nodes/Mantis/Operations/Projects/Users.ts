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
					},
				},
			},
			{
				name: 'Add or Update a Project User',
				value: 'projectAddOrUpdateUser',
				action: 'Add or update a project user',
				description:
					'Add a user to the project, or update their project-specific access level if already a member',
				options: [
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'number',
						default: null,
						description: 'ID of the user (provide ID or Username)',
					},
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						description: 'Username (used when User ID is empty)',
					},
					{
						displayName: 'Access Level',
						name: 'accessLevel',
						type: 'options',
						options: accessLevelOptions,
						default: 'developer',
						required: true,
						description: 'Project-specific access level for the user',
					},
				],
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
};
