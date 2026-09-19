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
 * Part D - output shaping: asserts postReceive rootProperty unwrapping per the
 *          n8n declarative-node docs idiom, using response shapes verified in
 *          the MantisBT 2.28.4 source (restcore handlers + Postman collection).
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
		getProjectUsers: ['projectId', 'minAccessLevel', 'includeAccessLevels'],
		getProjectUsersThatCanBeAssignedIssues: ['projectId', 'includeAccessLevels'],
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

check('B1: getAnIssue URL resolves; select param uses API name "select"', () => {
	const r = buildRequest('getAnIssue', { issueId: 42, selectFields: '' });
	assert.strictEqual(r.url, '/issues/42');
	assert.deepStrictEqual(r.qs, {}, 'empty selectFields must not send select=');
	const r2 = buildRequest('getAnIssue', { issueId: 42, selectFields: 'id,summary' });
	assert.deepStrictEqual(r2.qs, { select: 'id,summary' });
});

check('B2: getAllIssues qs uses API names page/page_size/select/filter_id/project_id', () => {
	const r = buildRequest('getAllIssues', { pageSize: 10, pageNumber: 1, selectFields: '', filter: '', projectId: null });
	assert.deepStrictEqual(r.qs, { page_size: 10, page: 1 });
	const r2 = buildRequest('getAllIssues', { pageSize: 10, pageNumber: 2, selectFields: 'id', filter: 'assigned', projectId: 5 });
	assert.deepStrictEqual(r2.qs, { page_size: 10, page: 2, select: 'id', filter_id: 'assigned', project_id: 5 });
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

check('B15: getProjectUsers / handlers URLs + documented query params', () => {
	const r = buildRequest('getProjectUsers', { projectId: 2, minAccessLevel: '', includeAccessLevels: true });
	assert.strictEqual(r.url, '/projects/2/users');
	assert.deepStrictEqual(r.qs, { include_access_levels: 1 });
	const r2 = buildRequest('getProjectUsers', { projectId: 2, minAccessLevel: '25', includeAccessLevels: false });
	assert.deepStrictEqual(r2.qs, { access_level: '25', include_access_levels: 0 });
	const r3 = buildRequest('getProjectUsersThatCanBeAssignedIssues', { projectId: 2, includeAccessLevels: true });
	assert.strictEqual(r3.url, '/projects/2/handlers');
	assert.deepStrictEqual(r3.qs, { include_access_levels: 1 });
});

check('B19: users GET ops send "select" (API name), never select_fields', () => {
	const me = buildRequest('getMyUserInfo', { selectFields: 'id,name' });
	assert.deepStrictEqual(me.qs, { select: 'id,name' });
	const meEmpty = buildRequest('getMyUserInfo', { selectFields: '' });
	assert.deepStrictEqual(meEmpty.qs, {});
	const byId = buildRequest('getUserById', { userId: 5, selectFields: 'id' });
	assert.deepStrictEqual(byId.qs, { select: 'id' });
	const byName = buildRequest('getUserByUsername', { username: 'bob', selectFields: '' });
	assert.deepStrictEqual(byName.qs, {});
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

/* ------------ Part D: output shaping (postReceive rootProperty) ----------- */

// Root property per wrapped GET, verified in MantisBT 2.28.4 source:
// rest_issue_get -> {"issues":[...]} (single issue also wrapped),
// rest_issue_files_get -> {"files":[...]} (single file also wrapped),
// rest_projects_get -> {"projects":[...]}, VersionGetCommand -> {"versions":[...]},
// ProjectUsersGetCommand -> {"users":[...]}, rest_user_get -> {"users":[user]}.
const EXPECTED_ROOT = {
	getAnIssue: 'issues',
	getAllIssues: 'issues',
	getIssueFiles: 'files',
	getIssueFile: 'files',
	getAllProjects: 'projects',
	getProject: 'projects',
	getProjectVersions: 'versions',
	getProjectVersion: 'versions',
	getProjectUsers: 'users',
	getProjectUsersThatCanBeAssignedIssues: 'users',
	getUserById: 'users',
	getUserByUsername: 'users',
};
// Deliberate raw pass-through (no unwrapping):
// - getMyUserInfo: /users/me returns a FLAT user object (live-verified)
// - getIssueViewPage: HTML page
// - all create/update ops: pass raw result through (safe for the 202
//   moderation empty-body case on note add, and 204-style empty responses)
const EXPECTED_NO_ROOT = [
	'getMyUserInfo',
	'getIssueViewPage',
	'createAnIssue',
	'updateAnIssue',
	'createAnIssueNote',
	'createProject',
	'updateProject',
	'addSubProject',
	'updateSubProject',
	'projectAddOrUpdateUser',
	'createProjectVersion',
	'updateProjectVersion',
	'createUser',
	'updateUser',
];

check('D0: every operation has an explicit rootProperty decision', () => {
	const covered = new Set([...Object.keys(EXPECTED_ROOT), ...EXPECTED_NO_ROOT]);
	for (const o of Object.keys(ops)) assert(covered.has(o), 'operation not covered by Part D: ' + o);
});

for (const [op, prop] of Object.entries(EXPECTED_ROOT)) {
	check(`D1[${op}]: unwraps response via rootProperty "${prop}"`, () => {
		const pr = ops[op].routing.output && ops[op].routing.output.postReceive;
		assert(pr && pr.length === 1 && pr[0].type === 'rootProperty', 'missing postReceive rootProperty');
		assert.strictEqual(pr[0].properties.property, prop);
	});
}

for (const op of EXPECTED_NO_ROOT) {
	check(`D2[${op}]: no response unwrapping (raw pass-through)`, () => {
		assert.strictEqual(ops[op].routing.output, undefined);
	});
}

// Simulate n8n's rootProperty transform on source-verified response shapes
function applyRootProperty(response, prop) {
	if (prop === undefined) return [response];
	const v = response[prop];
	if (v === undefined) return [response];
	return Array.isArray(v) ? v : [v];
}

check('D3: unwrap simulation on source-verified MantisBT 2.28.4 response shapes', () => {
	assert.strictEqual(applyRootProperty({ issues: [{ id: 1 }, { id: 2 }] }, 'issues').length, 2); // GET /issues
	assert.strictEqual(applyRootProperty({ issues: [{ id: 42 }] }, 'issues').length, 1); // GET /issues/{id}
	assert.strictEqual(applyRootProperty({ files: [{ id: 7 }] }, 'files').length, 1); // GET .../files/{fid}
	assert.strictEqual(applyRootProperty({ projects: [] }, 'projects').length, 0); // empty list -> 0 items
	assert.strictEqual(applyRootProperty({ versions: [{ name: '1.0' }] }, 'versions').length, 1);
	assert.strictEqual(applyRootProperty({ users: [{ id: 3 }] }, 'users').length, 1); // rest_user_get wraps
	assert.deepStrictEqual(applyRootProperty({ id: 3, name: 'me' }, undefined), [{ id: 3, name: 'me' }]); // /users/me flat
});

check('D4: inputs/outputs use NodeConnectionTypes.Main', () => {
	assert.deepStrictEqual(d.inputs, ['main']);
	assert.deepStrictEqual(d.outputs, ['main']);
});

check('D5: codex file points at real MantisBT docs (no template leftovers)', () => {
	const codex = require('../nodes/Mantis/Mantis.node.json');
	assert(!/httpbin/i.test(JSON.stringify(codex)), 'httpbin.org placeholder still present');
	const url = codex.resources.primaryDocumentation[0].url;
	assert(
		url.startsWith('https://documenter.getpostman.com/'),
		'unexpected primaryDocumentation url: ' + url,
	);
	for (const c of codex.categories) {
		assert(
			['Development', 'Miscellaneous'].includes(c),
			'category not in the verified-valid set: ' + c,
		);
	}
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
