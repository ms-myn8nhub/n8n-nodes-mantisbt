import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import Projects from './Projects';
import SubProjects from './SubProjects';
import Users from './Users';
import Versions from './Versions';

const verbs = [
	Projects,
	SubProjects,
	Users,
	Versions,
];

export const mantisVerbsResources: INodePropertyOptions[] = verbs.flatMap((verb) => verb.resource);

export const mantisVerbsOperations: INodeProperties[] = verbs.flatMap((verb) => verb.operations);

export default verbs;
