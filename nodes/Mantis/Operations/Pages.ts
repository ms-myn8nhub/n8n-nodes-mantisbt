import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Pages',
	value: 'mantisPagesVerb',
};

export const enum Operations {
	GetIssueViewPage = 'getIssueViewPage',
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
				name: 'Get Issue View Page',
				value: 'getIssueViewPage',
				action: 'Get issue view page',
				options: [
					{
						displayName: 'Issue ID',
						name: 'issueId',
						type: 'number',
						default: null,
						description: 'ID of the issue to retrieve the view page for',
					},
				],
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
};
