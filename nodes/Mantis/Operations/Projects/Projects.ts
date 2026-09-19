import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Projects',
	value: 'mantisProjectsVerb',
};

export const enum Operations {
	GetAllProjects = 'getAllProjects',
	GetProject = 'getProject',
	CreateProject = 'createProject',
	UpdateProject = 'updateProject',
	DeleteProject = 'deleteProject',
}

const showFor = (operations: string[]) => ({
	show: {
		resource: [resource.value],
		operation: operations,
	},
});

const projectStatusOptions = ['development', 'testing', 'stable', 'unused'].map((v) => ({
	name: v,
	value: v,
}));

const viewStateOptions = ['public', 'private'].map((v) => ({ name: v, value: v }));

const triStateOptions = [
	{ name: 'Do Not Change', value: '' },
	{ name: 'Yes', value: 'true' },
	{ name: 'No', value: 'false' },
];

export const fields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Project name (must be unique)',
		displayOptions: showFor([Operations.CreateProject]),
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'New project name (leave empty to keep current)',
		displayOptions: showFor([Operations.UpdateProject]),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		displayOptions: showFor([Operations.CreateProject, Operations.UpdateProject]),
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [{ name: 'Do Not Set', value: '' }, ...projectStatusOptions],
		default: '',
		displayOptions: showFor([Operations.CreateProject, Operations.UpdateProject]),
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		displayOptions: showFor([Operations.CreateProject]),
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'options',
		options: triStateOptions,
		default: '',
		displayOptions: showFor([Operations.UpdateProject]),
	},
	{
		displayName: 'View State',
		name: 'viewState',
		type: 'options',
		options: [{ name: 'Do Not Set', value: '' }, ...viewStateOptions],
		default: '',
		displayOptions: showFor([Operations.CreateProject, Operations.UpdateProject]),
	},
	{
		displayName: 'Inherit Global Categories',
		name: 'inheritGlobal',
		type: 'boolean',
		default: true,
		displayOptions: showFor([Operations.CreateProject]),
	},
	{
		displayName: 'Inherit Global Categories',
		name: 'inheritGlobal',
		type: 'options',
		options: triStateOptions,
		default: '',
		displayOptions: showFor([Operations.UpdateProject]),
	},
	{
		displayName: 'File Upload Path',
		name: 'filePath',
		type: 'string',
		default: '',
		description: 'Server-side path for file uploads (advanced; uses global default if empty)',
		displayOptions: showFor([Operations.CreateProject, Operations.UpdateProject]),
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
				name: 'Get All Projects',
				value: 'getAllProjects',
				action: 'Get all projects',
				routing: {
					request: {
						method: 'GET',
						url: '/projects/',
					},
				},
			},
			{
				name: 'Get a Project',
				value: 'getProject',
				action: 'Get a project',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}',
					},
				},
			},
			{
				name: 'Create a Project',
				value: 'createProject',
				action: 'Create a project',
				routing: {
					request: {
						method: 'POST',
						url: '/projects/',
						body: {
							name: '={{ $parameter.name }}',
							description: '={{ $parameter.description || undefined }}',
							status: '={{ $parameter.status ? { name: $parameter.status } : undefined }}',
							enabled: '={{ $parameter.enabled }}',
							view_state: '={{ $parameter.viewState ? { name: $parameter.viewState } : undefined }}',
							inherit_global: '={{ $parameter.inheritGlobal }}',
							file_path: '={{ $parameter.filePath || undefined }}',
						},
					},
				},
			},
			{
				name: 'Update a Project',
				value: 'updateProject',
				action: 'Update a project',
				description: 'Update a project (only filled-in fields are changed)',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/projects/{{ $parameter.projectId }}',
						body: {
							name: '={{ $parameter.name || undefined }}',
							description: '={{ $parameter.description || undefined }}',
							status: '={{ $parameter.status ? { name: $parameter.status } : undefined }}',
							enabled:
								'={{ $parameter.enabled === "true" ? true : ($parameter.enabled === "false" ? false : undefined) }}',
							view_state: '={{ $parameter.viewState ? { name: $parameter.viewState } : undefined }}',
							inherit_global:
								'={{ $parameter.inheritGlobal === "true" ? true : ($parameter.inheritGlobal === "false" ? false : undefined) }}',
							file_path: '={{ $parameter.filePath || undefined }}',
						},
					},
				},
			},
		],
		default: 'getAllProjects',
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
