import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Projects/Project Versions',
	value: 'mantisProjectVersionsVerb',
};

export const enum Operations {
	CreateProjectVersion = 'createProjectVersion',
	GetProjectVersions = 'getProjectVersions',
	GetProjectVersion = 'getProjectVersion',
	UpdateProjectVersion = 'updateProjectVersion',
	DeleteProjectVersion = 'deleteProjectVersion',
}

const versionIdField = (required: boolean): INodeProperties => ({
	displayName: 'Version ID',
	name: 'versionId',
	type: 'number',
	default: null,
	required,
	description: 'ID of the project version',
});

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
				name: 'Get Project Versions',
				value: 'getProjectVersions',
				action: 'Get project versions',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}/versions',
					},
				},
			},
			{
				name: 'Get a Project Version',
				value: 'getProjectVersion',
				action: 'Get a project version',
				options: [versionIdField(true)],
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}/versions/{{ $parameter.versionId }}',
					},
				},
			},
			{
				name: 'Create a Project Version',
				value: 'createProjectVersion',
				action: 'Create a project version',
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'v1.0.0',
						description: 'Version name',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
					},
					{
						displayName: 'Released',
						name: 'released',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Obsolete',
						name: 'obsolete',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'string',
						default: '',
						placeholder: '2020-02-20',
						description: 'Release date (YYYY-MM-DD)',
					},
				],
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ $parameter.projectId }}/versions',
						body: {
							name: '={{ $parameter.name }}',
							description: '={{ $parameter.description || undefined }}',
							released: '={{ $parameter.released }}',
							obsolete: '={{ $parameter.obsolete }}',
							timestamp: '={{ $parameter.timestamp || undefined }}',
						},
					},
				},
			},
			{
				name: 'Update a Project Version',
				value: 'updateProjectVersion',
				action: 'Update a project version',
				description: 'Update a project version (only filled-in fields are changed)',
				options: [
					versionIdField(true),
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'New version name (leave empty to keep current)',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
					},
					{
						displayName: 'Released',
						name: 'released',
						type: 'options',
						options: [
							{ name: 'Do Not Change', value: '' },
							{ name: 'Yes', value: 'true' },
							{ name: 'No', value: 'false' },
						],
						default: '',
					},
					{
						displayName: 'Obsolete',
						name: 'obsolete',
						type: 'options',
						options: [
							{ name: 'Do Not Change', value: '' },
							{ name: 'Yes', value: 'true' },
							{ name: 'No', value: 'false' },
						],
						default: '',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'string',
						default: '',
						placeholder: '2020-02-20',
						description: 'Release date (YYYY-MM-DD)',
					},
				],
				routing: {
					request: {
						method: 'PATCH',
						url: '=/projects/{{ $parameter.projectId }}/versions/{{ $parameter.versionId }}',
						body: {
							name: '={{ $parameter.name || undefined }}',
							description: '={{ $parameter.description || undefined }}',
							released:
								'={{ $parameter.released === "true" ? true : ($parameter.released === "false" ? false : undefined) }}',
							obsolete:
								'={{ $parameter.obsolete === "true" ? true : ($parameter.obsolete === "false" ? false : undefined) }}',
							timestamp: '={{ $parameter.timestamp || undefined }}',
						},
					},
				},
			},
		],
		default: 'getProjectVersions',
	},
];

export default {
	resource: resource,
	operations: operations,
};
