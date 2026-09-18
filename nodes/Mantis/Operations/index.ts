import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

// import Config from './Config';
// import Filters from './Filters';
// import Impersonation from './Impersonation';
import Issues from './Issues';
import IssueNotesAttachments from './IssueNotesAttachments';
// import Lang from './Lang';
import Pages from './Pages';
import Projects from './Projects';
import Users from './Users';
// import UserTokens from './UserTokens';

const verbs = [
	// Config,
	// Filters,
	// Impersonation,
	Issues,
	IssueNotesAttachments,
	// Lang,
	Pages,
	...Projects,
	Users,
	// UserTokens,
];

export const mantisVerbsResources: INodePropertyOptions[] = verbs.flatMap((verb) => verb.resource);

export const mantisVerbsOperations: INodeProperties[] = verbs.flatMap((verb) => verb.operations);
