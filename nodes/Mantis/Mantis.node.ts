import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { mantisVerbsResources, mantisVerbsOperations } from './Operations';
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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'mantisApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}/api/rest',
			url: '={{$credentials.baseUrl}}/api/rest',
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
			...options,
			...mantisVerbsOperations,
		],
	};
}
