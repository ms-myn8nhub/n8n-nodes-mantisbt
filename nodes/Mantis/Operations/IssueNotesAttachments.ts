import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Issue Notes and Attachments',
	value: 'mantisIssueNotesAttachmentsVerb',
};

export const enum Operations {
	CreateAnIssueNote = 'createAnIssueNote',
	CreateAnIssueNoteWithTimeTracking = 'createAnIssueNoteWithTimeTracking',
	CreateAnIssueNoteWithAttachment = 'createAnIssueNoteWithAttachment',
	DeleteAnIssueNote = 'deleteAnIssueNote',
	AddAttachmentsToIssue = 'addAttachmentsToIssue',
}

export const fields: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		description: 'Note text',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.CreateAnIssueNote],
			},
		},
	},
	{
		displayName: 'View State',
		name: 'viewState',
		type: 'options',
		options: [
			{ name: 'Do Not Set', value: '' },
			{ name: 'Public', value: 'public' },
			{ name: 'Private', value: 'private' },
		],
		default: '',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.CreateAnIssueNote],
			},
		},
	},
	{
		displayName: 'Time Tracking Duration',
		name: 'timeTracking',
		type: 'string',
		default: '',
		placeholder: '00:15',
		description: 'Duration in HH:MM format (requires time tracking to be enabled)',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: [Operations.CreateAnIssueNote],
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
				name: 'Create an Issue Note',
				value: Operations.CreateAnIssueNote,
				action: 'Create an issue note',
				description: 'Add a note to an issue, optionally with time tracking',
				routing: {
					request: {
						method: 'POST',
						url: '=/issues/{{ $parameter.issueId }}/notes',
						body: {
							text: '={{ $parameter.text }}',
							view_state: '={{ $parameter.viewState ? { name: $parameter.viewState } : undefined }}',
							time_tracking:
								'={{ $parameter.timeTracking ? { duration: $parameter.timeTracking } : undefined }}',
						},
					},
				},
			},
		],
		default: Operations.CreateAnIssueNote.toString(),
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
