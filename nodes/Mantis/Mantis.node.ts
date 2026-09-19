import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mantisVerbsResources, mantisVerbsOperations, mantisVerbsFields } from './Operations';
import { options } from './options';
export class Mantis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MantisBT',
		name: 'mantis',
		icon: 'file:assets/mantis.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Work with Mantis Bug Tracker',
		defaults: {
			name: 'MantisBT',
		},
		// 'main' is the runtime value of NodeConnectionType.Main across all
		// n8n-workflow versions (the export became a string-literal union type
		// in recent versions, so it can no longer be referenced as a value).
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'mantisApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}/api/rest',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: '={{ $credentials.apiToken }}',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: mantisVerbsResources,
				default: 'mantisIssueVerb',
			},
			// Operation selectors first, then shared fields (Issue ID, Project ID, ...),
			// then per-operation input fields - all top-level so the editor renders them.
			...mantisVerbsOperations,
			...options,
			...mantisVerbsFields,
		],
	};
}
