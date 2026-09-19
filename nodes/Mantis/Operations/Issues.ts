import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource: INodePropertyOptions = {
	name: 'Issues',
	value: 'mantisIssuesVerb',
};

export const enum Operations {
	GetAnIssue = 'getAnIssue',
	GetIssueFiles = 'getIssueFiles',
	GetIssueFile = 'getIssueFile',
	GetAllIssues = 'getAllIssues',
	CreateAnIssueMinimal = 'createAnIssueMinimal',
	CreateAnIssue = 'createAnIssue',
	CreateAnIssueWithAttachments = 'createAnIssueWithAttachments',
	UpdateAnIssueMinimal = 'updateAnIssueMinimal',
	UpdateAnIssue = 'updateAnIssue',
	DeleteAnIssue = 'deleteAnIssue',
	MonitorAnIssue = 'monitorAnIssue',
	MonitorAnIssueForSpecifiedUsers = 'monitorAnIssueForSpecifiedUsers',
	AttachTagToIssue = 'attachTagToIssue',
	DetachTagFromAnIssue = 'detachTagFromAnIssue',
	AddAnIssueRelationship = 'addAnIssueRelationship',
	DeleteAnIssueRelationship = 'deleteAnIssueRelationship',
}

const DOCS_URL =
	'https://documenter.getpostman.com/view/29959/mantis-bug-tracker-rest-api/7Lt6zkP';

const showFor = (operations: string[]) => ({
	show: {
		resource: [resource.value],
		operation: operations,
	},
});

/* -------------------------------------------------------------------------- */
/*                         Shared enum-style options                          */
/* Values are the standard MantisBT enum labels; instances may customize      */
/* them - any option field also accepts an expression with a custom value.    */
/* -------------------------------------------------------------------------- */

const priorityOptions = ['none', 'low', 'normal', 'high', 'urgent', 'immediate'].map((v) => ({
	name: v,
	value: v,
}));

const severityOptions = [
	'feature',
	'trivial',
	'text',
	'tweak',
	'minor',
	'major',
	'crash',
	'block',
].map((v) => ({ name: v, value: v }));

const reproducibilityOptions = ['always', 'random', 'sometimes', 'unable', 'n/a', 'unknown'].map(
	(v) => ({ name: v, value: v }),
);

const statusOptions = [
	'new',
	'feedback',
	'acknowledged',
	'confirmed',
	'assigned',
	'resolved',
	'closed',
].map((v) => ({ name: v, value: v }));

const resolutionOptions = [
	'open',
	'fixed',
	'reopened',
	'unable-to-duplicate',
	'not-fixable',
	'duplicate',
	'no-change-required',
	'suspended',
	'wont-fix',
].map((v) => ({ name: v, value: v }));

const viewStateOptions = ['public', 'private'].map((v) => ({ name: v, value: v }));

const notSetOption = { name: 'Do Not Set', value: '' };

const triStateOptions = [
	{ name: 'Do Not Change', value: '' },
	{ name: 'Yes', value: 'true' },
	{ name: 'No', value: 'false' },
];

/* -------------------------------------------------------------------------- */
/*                     Top-level fields (rendered by n8n)                     */
/* n8n only renders INodeProperties listed in the node's `properties` array;  */
/* nesting fields inside an operation's option entry is NOT rendered.         */
/* -------------------------------------------------------------------------- */

const additionalFieldsCollection: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: showFor([Operations.CreateAnIssue, Operations.UpdateAnIssue]),
	options: [
		{
			displayName: 'Additional Information',
			name: 'additionalInformation',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
		},
		{
			displayName: 'Steps to Reproduce',
			name: 'stepsToReproduce',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
		},
		{
			displayName: 'Custom Fields',
			name: 'customFields',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'values',
					displayName: 'Custom Field',
					values: [
						{
							displayName: 'Field Name',
							name: 'fieldName',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Field Value',
							name: 'fieldValue',
							type: 'string',
							default: '',
						},
					],
				},
			],
		},
		{
			displayName: 'Due Date',
			name: 'dueDate',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Fixed in Version',
			name: 'fixedInVersion',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Handler (Username)',
			name: 'handler',
			type: 'string',
			default: '',
			description: 'Username of the user the issue is assigned to',
		},
		{
			displayName: 'Operating System',
			name: 'os',
			type: 'string',
			default: '',
		},
		{
			displayName: 'OS Build',
			name: 'osBuild',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Platform',
			name: 'platform',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Priority',
			name: 'priority',
			type: 'options',
			options: [notSetOption, ...priorityOptions],
			default: '',
		},
		{
			displayName: 'Reproducibility',
			name: 'reproducibility',
			type: 'options',
			options: [notSetOption, ...reproducibilityOptions],
			default: '',
		},
		{
			displayName: 'Reporter (Username)',
			name: 'reporter',
			type: 'string',
			default: '',
			description: 'Username to report the issue as (requires sufficient access level)',
		},
		{
			displayName: 'Resolution',
			name: 'resolution',
			type: 'options',
			options: [notSetOption, ...resolutionOptions],
			default: '',
		},
		{
			displayName: 'Severity',
			name: 'severity',
			type: 'options',
			options: [notSetOption, ...severityOptions],
			default: '',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			options: [notSetOption, ...statusOptions],
			default: '',
		},
		{
			displayName: 'Sticky',
			name: 'sticky',
			type: 'options',
			options: triStateOptions,
			default: '',
		},
		{
			displayName: 'Tags',
			name: 'tags',
			type: 'string',
			default: '',
			description: 'Comma-separated list of tag names, e.g. "backend,urgent"',
		},
		{
			displayName: 'Target Version',
			name: 'targetVersion',
			type: 'string',
			default: '',
		},
		{
			displayName: 'View State',
			name: 'viewState',
			type: 'options',
			options: [notSetOption, ...viewStateOptions],
			default: '',
		},
		{
			displayName: 'Version (Product Version)',
			name: 'version',
			type: 'string',
			default: '',
		},
	],
};

export const fields: INodeProperties[] = [
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor([Operations.CreateAnIssue]),
	},
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		description: 'New summary (leave empty to keep current)',
		displayOptions: showFor([Operations.UpdateAnIssue]),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		displayOptions: showFor([Operations.CreateAnIssue, Operations.UpdateAnIssue]),
	},
	{
		displayName: 'Project Name',
		name: 'projectName',
		type: 'string',
		default: '',
		description:
			'Name of the project to create the issue in (used when Project ID above is empty; both may be empty if the instance has a default project)',
		displayOptions: showFor([Operations.CreateAnIssue]),
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'string',
		default: '',
		description: 'Category name (must exist in the project, e.g. "General")',
		displayOptions: showFor([Operations.CreateAnIssue, Operations.UpdateAnIssue]),
	},
	additionalFieldsCollection,
];

/* Body expressions shared by create/update. Every optional field resolves to
 * undefined when not filled in, so it is omitted from the JSON payload. */
function issueBody(forUpdate: boolean): { [key: string]: string } {
	return {
		summary: forUpdate ? '={{ $parameter.summary || undefined }}' : '={{ $parameter.summary }}',
		description: '={{ $parameter.description || undefined }}',
		...(forUpdate
			? {}
			: {
					project:
						'={{ $parameter.projectId ? { id: $parameter.projectId } : ($parameter.projectName ? { name: $parameter.projectName } : undefined) }}',
			  }),
		category: '={{ $parameter.category ? { name: $parameter.category } : undefined }}',
		additional_information: '={{ $parameter.additionalFields?.additionalInformation || undefined }}',
		steps_to_reproduce: '={{ $parameter.additionalFields?.stepsToReproduce || undefined }}',
		handler:
			'={{ $parameter.additionalFields?.handler ? { name: $parameter.additionalFields.handler } : undefined }}',
		reporter:
			'={{ $parameter.additionalFields?.reporter ? { name: $parameter.additionalFields.reporter } : undefined }}',
		priority:
			'={{ $parameter.additionalFields?.priority ? { name: $parameter.additionalFields.priority } : undefined }}',
		severity:
			'={{ $parameter.additionalFields?.severity ? { name: $parameter.additionalFields.severity } : undefined }}',
		reproducibility:
			'={{ $parameter.additionalFields?.reproducibility ? { name: $parameter.additionalFields.reproducibility } : undefined }}',
		status: '={{ $parameter.additionalFields?.status ? { name: $parameter.additionalFields.status } : undefined }}',
		resolution:
			'={{ $parameter.additionalFields?.resolution ? { name: $parameter.additionalFields.resolution } : undefined }}',
		view_state:
			'={{ $parameter.additionalFields?.viewState ? { name: $parameter.additionalFields.viewState } : undefined }}',
		version: '={{ $parameter.additionalFields?.version || undefined }}',
		target_version: '={{ $parameter.additionalFields?.targetVersion || undefined }}',
		fixed_in_version: '={{ $parameter.additionalFields?.fixedInVersion || undefined }}',
		platform: '={{ $parameter.additionalFields?.platform || undefined }}',
		os: '={{ $parameter.additionalFields?.os || undefined }}',
		os_build: '={{ $parameter.additionalFields?.osBuild || undefined }}',
		due_date: '={{ $parameter.additionalFields?.dueDate || undefined }}',
		sticky:
			'={{ $parameter.additionalFields?.sticky === "true" ? true : ($parameter.additionalFields?.sticky === "false" ? false : undefined) }}',
		tags: '={{ $parameter.additionalFields?.tags ? $parameter.additionalFields.tags.split(",").map((t) => t.trim()).filter((t) => t !== "").map((t) => ({ name: t })) : undefined }}',
		custom_fields:
			'={{ $parameter.additionalFields?.customFields?.values?.length ? $parameter.additionalFields.customFields.values.map((cf) => ({ field: { name: cf.fieldName }, value: cf.fieldValue })) : undefined }}',
	};
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
				name: 'Get An Issue',
				value: Operations.GetAnIssue,
				action: 'Get an issue',
				routing: {
					request: {
						method: 'GET',
						url: '=/issues/{{ $parameter.issueId }}',
						qs: {
							select_fields: '={{ $parameter.selectFields || "" }}',
						},
					},
				},
			},
			{
				name: 'Get Issue Files',
				value: Operations.GetIssueFiles,
				action: 'Get issue files',
				routing: {
					request: {
						method: 'GET',
						url: '=/issues/{{ $parameter.issueId }}/files',
					},
				},
			},
			{
				name: 'Get Issue File',
				value: Operations.GetIssueFile,
				action: 'Get issue file',
				routing: {
					request: {
						method: 'GET',
						url: '=/issues/{{ $parameter.issueId }}/files/{{ $parameter.fileId }}',
					},
				},
			},
			{
				name: 'Get All Issues',
				value: Operations.GetAllIssues,
				action: 'Get all issues',
				routing: {
					request: {
						method: 'GET',
						url: '/issues',
						qs: {
							page_size: '={{ $parameter.pageSize }}',
							page_number: '={{ $parameter.pageNumber }}',
							select_fields: '={{ $parameter.selectFields || "" }}',
							filter: '={{ $parameter.filter || undefined }}',
							project_id: '={{ $parameter.projectId || undefined }}',
						},
					},
				},
			},
			{
				name: 'Create an Issue',
				value: Operations.CreateAnIssue,
				action: 'Create an issue',
				description: `Create a new issue. Summary is mandatory; provide Project ID or Name unless the instance has a default project. <a href="${DOCS_URL}">Docs</a>`,
				routing: {
					request: {
						method: 'POST',
						url: '/issues',
						body: issueBody(false),
					},
				},
			},
			{
				name: 'Update an Issue',
				value: Operations.UpdateAnIssue,
				action: 'Update an issue',
				description: `Update an existing issue (PATCH semantics - only filled-in fields are changed). <a href="${DOCS_URL}">Docs</a>`,
				routing: {
					request: {
						method: 'PATCH',
						url: '=/issues/{{ $parameter.issueId }}',
						body: issueBody(true),
					},
				},
			},
		],
		default: Operations.GetAllIssues.toString(),
	},
];

export default {
	resource: resource,
	operations: operations,
	fields: fields,
};
