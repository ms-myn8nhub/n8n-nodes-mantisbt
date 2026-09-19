import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Projects/Sub-Projects',
	value: 'mantisSubProjectsVerb',
};

export const enum Operations {
	AddSubProject = 'addSubProject',
	UpdateSubProject = 'updateSubProject',
	DeleteSubProject = 'deleteSubProject',
}

const showFor = (operations: string[]) => ({
	show: {
		resource: [resource.value],
		operation: operations,
	},
});

export const fields: INodeProperties[] = [
	{
		displayName: 'Sub-Project ID',
		name: 'subProjectId',
		type: 'number',
		default: null,
		description: 'ID of the project to attach as sub-project (provide ID or Name)',
		displayOptions: showFor([Operations.AddSubProject]),
	},
	{
		displayName: 'Sub-Project ID',
		name: 'subProjectId',
		type: 'number',
		default: null,
		required: true,
		description: 'ID of the sub-project',
		displayOptions: showFor([Operations.UpdateSubProject]),
	},
	{
		displayName: 'Sub-Project Name',
		name: 'subProjectName',
		type: 'string',
		default: '',
		description: 'Name of the project to attach (used when Sub-Project ID is empty)',
		displayOptions: showFor([Operations.AddSubProject]),
	},
	{
		displayName: 'Inherit Parent Categories',
		name: 'inheritParent',
		type: 'boolean',
		default: true,
		displayOptions: showFor([Operations.AddSubProject, Operations.UpdateSubProject]),
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
				name: 'Add a Sub-Project',
				value: 'addSubProject',
				action: 'Add a sub-project',
				description: 'Link an existing project as a sub-project of the Project ID selected above',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ $parameter.projectId }}/subprojects',
						body: {
							project:
								'={{ $parameter.subProjectId ? { id: $parameter.subProjectId } : ($parameter.subProjectName ? { name: $parameter.subProjectName } : undefined) }}',
							inherit_parent: '={{ $parameter.inheritParent }}',
						},
					},
				},
			},
			{
				name: 'Update a Sub-Project',
				value: 'updateSubProject',
				action: 'Update a sub-project',
				description: 'Update the parent-inheritance setting of a sub-project link',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/projects/{{ $parameter.projectId }}/subprojects/{{ $parameter.subProjectId }}',
						body: {
							inherit_parent: '={{ $parameter.inheritParent }}',
						},
					},
				},
			},
		],
		default: 'addSubProject',
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
