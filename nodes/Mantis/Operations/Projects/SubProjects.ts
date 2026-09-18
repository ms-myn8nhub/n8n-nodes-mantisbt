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
				description:
					'Link an existing project as a sub-project of the (parent) Project ID selected above',
				options: [
					{
						displayName: 'Sub-Project ID',
						name: 'subProjectId',
						type: 'number',
						default: null,
						description: 'ID of the project to attach as sub-project (provide ID or Name)',
					},
					{
						displayName: 'Sub-Project Name',
						name: 'subProjectName',
						type: 'string',
						default: '',
						description: 'Name of the project to attach (used when Sub-Project ID is empty)',
					},
					{
						displayName: 'Inherit Parent Categories',
						name: 'inheritParent',
						type: 'boolean',
						default: true,
					},
				],
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
				options: [
					{
						displayName: 'Sub-Project ID',
						name: 'subProjectId',
						type: 'number',
						default: null,
						required: true,
						description: 'ID of the sub-project',
					},
					{
						displayName: 'Inherit Parent Categories',
						name: 'inheritParent',
						type: 'boolean',
						default: true,
					},
				],
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
};
