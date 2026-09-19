import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Pages',
	value: 'mantisPagesVerb',
};

export const enum Operations {
	GetIssueViewPage = 'getIssueViewPage',
}

export const fields: INodeProperties[] = [];

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
				name: 'Get Issue View Page',
				value: 'getIssueViewPage',
				action: 'Get issue view page',
				routing: {
					request: {
						method: 'GET',
						url: '=/pages/issues/view/{{ $parameter.issueId }}',
					},
				},
			},
		],
		default: 'getIssueViewPage',
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
