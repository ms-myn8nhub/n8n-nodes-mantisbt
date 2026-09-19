/* Smoke test for the declarative Mantis node.
 *
 * Part A - UI structure: uses n8n-workflow's real displayParameter() (the same
 *          logic the editor uses) to assert which fields are VISIBLE for every
 *          resource/operation pair, that no operation entry hides fields in a
 *          nested `options` array (never rendered by the editor - the v0.2.0
 *          bug), that no duplicate field names are visible at once, and that
 *          every $parameter referenced by an operation's routing is actually
 *          enterable in the UI.
 * Part B - request building: simulates n8n's RoutingNode expression resolution
 *          and asserts method/url/body/qs for every operation.
 * Part C - end-to-end mock HTTP request.
 */
'use strict';
const http = require('http');
const assert = require('assert');

const { Mantis } = require('../dist/nodes/Mantis/Mantis.node.js');
const { displayParameter } = require('n8n-workflow');

const $credentials = { baseUrl: 'https://mantisbt.aube.website', apiToken: 'TOKEN123' };
const results = [];
let failures = 0;
function check(name, fn) {
	try {
		fn();
		results.push('PASS  ' + name);
	} catch (e) {
		results.push('FAIL  ' + name + '  ->  ' + e.message);
		failures++;
		process.exitCode = 1;
	}
}

const node = new Mantis();
const d = node.description;
const props = d.properties;

// Map: resource -> operation selector property
const selectors = props.filter((p) => p.name === 'operation');
const resources = props[0].options.map((o) => o.value);

function visibleFields(resource, operation) {
	const nodeValues = { resource, operation };
	const fakeNode = { typeVersion: 1 };
	return props.filter(
		(p) => p.name !== 'resource' && p.name !== 'operation' && displayParameter(nodeValues, p, fakeNode),
	);
}

// Expected visible fields per operation (order-insensitive)
const EXPECTED = {
	mantisIssuesVerb: {
		getAnIssue: ['issueId', 'selectFields'],
		getIssueFiles: ['issueId'],
		getIssueFile: ['issueId', 'fileId'],
		getAllIssues: ['selectFields', 'pageSize', 'pageNumber', 'filter', 'projectId'],
		createAnIssue: ['projectId', 'summary', 'description', 'projectName', 'category', 'additionalFields'],
		updateAnIssue: ['issueId', 'summary', 'description', 'category', 'additionalFields'],
	},
	mantisIssueNotesAttachmentsVerb: {
		createAnIssueNote: ['issueId', 'text', 'viewState', 'timeTracking'],
	},
	mantisPagesVerb: {
		getIssueViewPage: ['issueId'],
	},
	mantisProjectsVerb: {
		getAllProjects: [],
		getProject: ['projectId'],
		createProject: ['name', 'description', 'status', 'enabled', 'viewState', 'inheritGlobal', 'filePath'],
		updateProject: ['projectId', 'name', 'description', 'status', 'enabled', 'viewState', 'inheritGlobal', 'filePath'],
	},
	mantisSubProjectsVerb: {
		addSubProject: ['projectId', 'subProjectId', 'subProjectName', 'inheritParent'],
		updateSubProject: ['projectId', 'subProjectId', 'inheritParent'],
	},
	mantisProjectUsersVerb: {
		getProjectUsers: ['projectId'],
		getProjectUsersThatCanBeAssignedIssues: ['projectId'],
		projectAddOrUpdateUser: ['projectId', 'userId', 'username', 'accessLevel'],
	},
	mantisProjectVersionsVerb: {
		getProjectVersions: ['projectId'],
		getProjectVersion: ['projectId', 'versionId'],
		createProjectVersion: ['projectId', 'name', 'description', 'released', 'obsolete', 'timestamp'],
		updateProjectVersion: ['projectId', 'versionId', 'name', 'description', 'released', 'obsolete', 'timestamp'],
	},
	mantisUsersVerb: {
		getMyUserInfo: ['selectFields'],
		getUserById: ['userId', 'selectFields'],
		getUserByUsername: ['username', 'selectFields'],
		createUser: ['username', 'password', 'realName', 'email', 'accessLevel', 'enabled', 'protected'],
		updateUser: ['userId', 'username', 'password', 'realName', 'email', 'accessLevel', 'enabled', 'protected'],
	},
};

/* ------------------------------ Part A: UI ------------------------------ */

check('A0: no operation entry nests fields in options (the 0.2.0 bug)', () => {
	for (const sel of selectors) {
		for (const op of sel.options || []) {
			assert.strictEqual(
				'options' in op,
				false,
				`operation ${op.value} has nested options (never rendered by the editor)`,
			);
		}
	}
});

for (const res of resources) {
	const expected = EXPECTED[res];
	if (!expected) continue; // resource without operations mapped here
	for (const [op, expectedNames] of Object.entries(expected)) {
		check(`A1[${res}/${op}]: visible fields match expected`, () => {
			const visible = visibleFields(res, op).map((p) => p.name);
			assert.deepStrictEqual(
				[...visible].sort(),
				[...expectedNames].sort(),
				`visible: ${JSON.stringify(visible)}`,
			);
		});
		check(`A2[${res}/${op}]: no duplicate visible field names`, () => {
			const visible = visibleFields(res, op).map((p) => p.name);
			assert.strictEqual(new Set(visible).size, visible.length, `duplicates in ${JSON.stringify(visible)}`);
		});
		check(`A3[${res}/${op}]: every $parameter used in routing is visible in the UI`, () => {
			const sel = selectors.find((s) => s.displayOptions.show.resource[0] === res);
			const entry = (sel.options || []).find((o) => o.value === op);
			assert(entry, 'operation entry not found');
			const refs = new Set(
				(JSON.stringify(entry.routing || {}).match(/\$parameter\.(\w+)/g) || []).map((m) =>
					m.replace('$parameter.', ''),
				),
			);
			const visible = new Set(visibleFields(res, op).map((p) => p.name));
			const missing = [...refs].filter((r) => !visible.has(r));
			assert.deepStrictEqual(missing, [], `routing references invisible parameters: ${missing}`);
		});
	}
}

/* ---------------------- Part B: request building ------------------------ */

function resolve(value, $parameter, $json = {}) {
	if (typeof value === 'string') {
		if (!value.startsWith('=')) return value;
		const expr = value.slice(1);
		const m = expr.match(/^\{\{([\s\S]*)\}\}$/);
		const fn = (e) =>
			// eslint-disable-next-line no-new-func
			new Function('$parameter', '$credentials', '$json', 'return (' + e + ');')($parameter, $credentials, $json);
		if (m) return fn(m[1]);
		return expr.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => String(fn(e)));
	}
	if (Array.isArray(value)) return value.map((v) => resolve(v, $parameter, $json));
	if (value && typeof value === 'object') {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = resolve(v, $parameter, $json);
		return out;
	}
	return value;
}

const ops = {};
for (const sel of selectors) for (const o of sel.options || []) ops[o.value] = o;

function buildRequest(opValue, $parameter) {
	const op = ops[opValue];
	assert(op, 'operation not found: ' + opValue);
	const baseURL = resolve(d.requestDefaults.baseURL, $parameter);
	const req = op.routing.request;
	const url = resolve(req.url, $parameter);
	const body = req.body ? JSON.parse(JSON.stringify(resolve(req.body, $parameter))) : undefined;
	const qs = req.qs ? JSON.parse(JSON.stringify(resolve(req.qs, $parameter))) : undefined;
	return { method: req.method, baseURL, url, body, qs };
}

check('B0: baseURL resolves from credentials', () => {
	assert.strictEqual(buildRequest('getAllProjects', {}).baseURL, 'https://mantisbt.aube.website/api/rest');
});

check('B1: getAnIssue URL resolves', () => {
	const r = buildRequest('getAnIssue', { issueId: 42, selectFields: '' });
	assert.strictEqual(r.url, '/issues/42');
	assert.deepStrictEqual(r.qs, { select_fields: '' });
});

check('B2: getAllIssues qs guards empty filter/project', () => {
	const r = buildRequest('getAllIssues', { pageSize: 10, pageNumber: 1, selectFields: '', filter: '', projectId: null });
	assert.deepStrictEqual(r.qs, { page_size: 10, page_number: 1, select_fields: '' });
});

check('B3: createAnIssue minimal', () => {
	const r = buildRequest('createAnIssue', { summary: 'Test issue', description: '', projectId: 5, projectName: '', category: '' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/issues');
	assert.deepStrictEqual(r.body, { summary: 'Test issue', project: { id: 5 } });
});

check('B4: createAnIssue full field mapping', () => {
	const r = buildRequest('createAnIssue', {
		summary: 'Full issue', description: 'Desc', projectId: null, projectName: 'MyProject', category: 'General',
		additionalFields: {
			additionalInformation: 'info', stepsToReproduce: 'steps', handler: 'dev1', reporter: '',
			priority: 'high', severity: 'major', reproducibility: 'always', status: '', resolution: '',
			viewState: 'private', version: '1.0', targetVersion: '2.0', fixedInVersion: '',
			platform: 'PC', os: 'Linux', osBuild: '6.1', dueDate: '2026-10-01T00:00:00.000Z',
			sticky: 'true', tags: 'backend, urgent ,,api',
			customFields: { values: [{ fieldName: 'City', fieldValue: 'Paris' }, { fieldName: 'Team', fieldValue: 'Core' }] },
		},
	});
	assert.deepStrictEqual(r.body, {
		summary: 'Full issue', description: 'Desc',
		project: { name: 'MyProject' }, category: { name: 'General' },
		additional_information: 'info', steps_to_reproduce: 'steps',
		handler: { name: 'dev1' }, priority: { name: 'high' }, severity: { name: 'major' },
		reproducibility: { name: 'always' }, view_state: { name: 'private' },
		version: '1.0', target_version: '2.0', platform: 'PC', os: 'Linux', os_build: '6.1',
		due_date: '2026-10-01T00:00:00.000Z', sticky: true,
		tags: [{ name: 'backend' }, { name: 'urgent' }, { name: 'api' }],
		custom_fields: [{ field: { name: 'City' }, value: 'Paris' }, { field: { name: 'Team' }, value: 'Core' }],
	});
});

check('B5: updateAnIssue PATCHes only provided fields', () => {
	const r = buildRequest('updateAnIssue', {
		issueId: 42, summary: '', description: '', category: '',
		additionalFields: { status: 'resolved', resolution: 'fixed', sticky: 'false' },
	});
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/issues/42');
	assert.deepStrictEqual(r.body, { status: { name: 'resolved' }, resolution: { name: 'fixed' }, sticky: false });
});

check('B6: updateAnIssue with untouched collection sends empty body', () => {
	const r = buildRequest('updateAnIssue', { issueId: 42, summary: '', description: '', category: '' });
	assert.deepStrictEqual(r.body, {});
});

check('B7: createAnIssueNote with time tracking', () => {
	const r = buildRequest('createAnIssueNote', { issueId: 42, text: 'Worked on it', viewState: 'private', timeTracking: '01:30' });
	assert.strictEqual(r.url, '/issues/42/notes');
	assert.deepStrictEqual(r.body, { text: 'Worked on it', view_state: { name: 'private' }, time_tracking: { duration: '01:30' } });
});

check('B8: createProject', () => {
	const r = buildRequest('createProject', { name: 'New Project', description: '', status: 'development', enabled: true, viewState: '', inheritGlobal: true, filePath: '' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/projects/');
	assert.deepStrictEqual(r.body, { name: 'New Project', status: { name: 'development' }, enabled: true, inherit_global: true });
});

check('B9: updateProject tri-state booleans', () => {
	const r = buildRequest('updateProject', { projectId: 7, name: '', description: 'd', status: '', enabled: 'false', viewState: '', inheritGlobal: '', filePath: '' });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/projects/7');
	assert.deepStrictEqual(r.body, { description: 'd', enabled: false });
});

check('B10: createProjectVersion', () => {
	const r = buildRequest('createProjectVersion', { projectId: 7, name: 'v1.0.0', description: '', released: false, obsolete: false, timestamp: '2026-01-01' });
	assert.strictEqual(r.url, '/projects/7/versions');
	assert.deepStrictEqual(r.body, { name: 'v1.0.0', released: false, obsolete: false, timestamp: '2026-01-01' });
});

check('B11: updateProjectVersion partial', () => {
	const r = buildRequest('updateProjectVersion', { projectId: 7, versionId: 3, name: '', description: '', released: 'true', obsolete: '', timestamp: '' });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/projects/7/versions/3');
	assert.deepStrictEqual(r.body, { released: true });
});

check('B12: addSubProject by name', () => {
	const r = buildRequest('addSubProject', { projectId: 1, subProjectId: null, subProjectName: 'Sub', inheritParent: true });
	assert.strictEqual(r.url, '/projects/1/subprojects');
	assert.deepStrictEqual(r.body, { project: { name: 'Sub' }, inherit_parent: true });
});

check('B13: updateSubProject', () => {
	const r = buildRequest('updateSubProject', { projectId: 1, subProjectId: 9, inheritParent: false });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/projects/1/subprojects/9');
	assert.deepStrictEqual(r.body, { inherit_parent: false });
});

check('B14: projectAddOrUpdateUser by username', () => {
	const r = buildRequest('projectAddOrUpdateUser', { projectId: 1, userId: null, username: 'bob', accessLevel: 'developer' });
	assert.strictEqual(r.url, '/projects/1/users');
	assert.deepStrictEqual(r.body, { user: { name: 'bob' }, access_level: { name: 'developer' } });
});

check('B15: getProjectUsers / handlers URLs', () => {
	assert.strictEqual(buildRequest('getProjectUsers', { projectId: 2 }).url, '/projects/2/users');
	assert.strictEqual(buildRequest('getProjectUsersThatCanBeAssignedIssues', { projectId: 2 }).url, '/projects/2/handlers');
});

check('B16: createUser', () => {
	const r = buildRequest('createUser', { username: 'bob', password: 'secret', realName: '', email: 'b@x.com', accessLevel: 'reporter', enabled: true, protected: false });
	assert.strictEqual(r.url, '/users/');
	assert.deepStrictEqual(r.body, { username: 'bob', password: 'secret', email: 'b@x.com', access_level: { name: 'reporter' }, enabled: true, protected: false });
});

check('B17: updateUser partial', () => {
	const r = buildRequest('updateUser', { userId: 3, username: '', password: '', realName: 'Bob', email: '', accessLevel: '', enabled: '', protected: 'true' });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/users/3');
	assert.deepStrictEqual(r.body, { real_name: 'Bob', protected: true });
});

check('B18: users GET urls', () => {
	assert.strictEqual(buildRequest('getMyUserInfo', { selectFields: '' }).url, '/users/me');
	assert.strictEqual(buildRequest('getUserById', { userId: 5, selectFields: '' }).url, '/users/5');
	assert.strictEqual(buildRequest('getUserByUsername', { username: 'bob', selectFields: '' }).url, '/users/username/bob');
});

/* ------------------------- Part C: e2e mock HTTP ------------------------- */

const server = http.createServer((req, res) => {
	let data = '';
	req.on('data', (c) => (data += c));
	req.on('end', () => {
		res.writeHead(201, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ method: req.method, url: req.url, auth: req.headers.authorization, body: data ? JSON.parse(data) : null }));
	});
});

server.listen(0, '127.0.0.1', async () => {
	const port = server.address().port;
	try {
		const r = buildRequest('createAnIssue', { summary: 'E2E', description: '', projectId: 5, projectName: '', category: 'General', additionalFields: { priority: 'high', tags: 'a,b' } });
		const resp = await fetch(`http://127.0.0.1:${port}/api/rest${r.url}`, {
			method: r.method,
			headers: { 'Content-Type': 'application/json', Authorization: $credentials.apiToken },
			body: JSON.stringify(r.body),
		});
		const echoed = await resp.json();
		assert.strictEqual(echoed.method, 'POST');
		assert.strictEqual(echoed.url, '/api/rest/issues');
		assert.strictEqual(echoed.auth, 'TOKEN123');
		assert.deepStrictEqual(echoed.body.tags, [{ name: 'a' }, { name: 'b' }]);
		results.push('PASS  C1: e2e mock HTTP request (POST /api/rest/issues, raw-token auth)');
	} catch (e) {
		results.push('FAIL  C1: e2e mock HTTP request -> ' + e.message);
		process.exitCode = 1;
		failures++;
	} finally {
		server.close();
		console.log(results.join('\n'));
		console.log(failures ? `\n${failures} CHECK(S) FAILED` : `\nALL ${results.length} CHECKS PASSED`);
	}
});
