/* Smoke test: simulates n8n's RoutingNode resolution semantics for the
 * declarative Mantis node and validates every create/update operation:
 *  - strings starting with '=' and matching ={{ expr }} are evaluated as JS
 *    with $parameter/$credentials/$json injected (like n8n's expression engine)
 *  - objects/arrays are resolved recursively
 *  - undefined values are dropped by JSON serialization (like axios does)
 * Then the resolved request is actually sent to a local mock HTTP server.
 */
'use strict';
const http = require('http');
const assert = require('assert');

const { Mantis } = require('../dist/nodes/Mantis/Mantis.node.js');

const $credentials = { baseUrl: 'https://mantisbt.aube.website', apiToken: 'TOKEN123' };

function resolve(value, $parameter, $json = {}) {
	if (typeof value === 'string') {
		if (!value.startsWith('=')) return value;
		const expr = value.slice(1);
		const m = expr.match(/^\{\{([\s\S]*)\}\}$/);
		if (m) {
			// single expression: may return objects/undefined
			// eslint-disable-next-line no-new-func
			return new Function('$parameter', '$credentials', '$json', 'return (' + m[1] + ');')(
				$parameter, $credentials, $json,
			);
		}
		// template with multiple {{ }}
		return expr.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) =>
			String(new Function('$parameter', '$credentials', '$json', 'return (' + e + ');')($parameter, $credentials, $json)),
		);
	}
	if (Array.isArray(value)) return value.map((v) => resolve(v, $parameter, $json));
	if (value && typeof value === 'object') {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = resolve(v, $parameter, $json);
		return out;
	}
	return value;
}

const node = new Mantis();
const d = node.description;

// collect operations by value
const ops = {};
for (const prop of d.properties.filter((p) => p.name === 'operation')) {
	for (const o of prop.options || []) ops[o.value] = o;
}

function buildRequest(opValue, $parameter) {
	const op = ops[opValue];
	assert(op, 'operation not found: ' + opValue);
	const baseURL = resolve(d.requestDefaults.baseURL, $parameter);
	const req = op.routing.request;
	const url = resolve(req.url, $parameter);
	const body = req.body ? JSON.parse(JSON.stringify(resolve(req.body, $parameter))) : undefined; // JSON roundtrip drops undefined like axios
	const qs = req.qs ? JSON.parse(JSON.stringify(resolve(req.qs, $parameter))) : undefined;
	return { method: req.method, baseURL, url, body, qs };
}

const results = [];
function check(name, fn) {
	try {
		fn();
		results.push('PASS  ' + name);
	} catch (e) {
		results.push('FAIL  ' + name + '  ->  ' + e.message);
		process.exitCode = 1;
	}
}

// 0. baseURL fix (bug #1)
check('baseURL resolves from credentials', () => {
	const r = buildRequest('getAllProjects', {});
	assert.strictEqual(r.baseURL, 'https://mantisbt.aube.website/api/rest');
});

// 1. GET url expressions resolve (bug #2)
check('getAnIssue URL resolves (bug #2 fix)', () => {
	const r = buildRequest('getAnIssue', { issueId: 42, selectFields: '' });
	assert.strictEqual(r.url, '/issues/42');
	assert.deepStrictEqual(r.qs, { select_fields: '' });
});

check('getAllIssues qs guards empty filter/project', () => {
	const r = buildRequest('getAllIssues', { pageSize: 10, pageNumber: 1, selectFields: '', filter: '', projectId: null });
	assert.deepStrictEqual(r.qs, { page_size: 10, page_number: 1, select_fields: '' });
});

// 2. Create issue - minimal
check('createAnIssue minimal sends only set fields', () => {
	const r = buildRequest('createAnIssue', { summary: 'Test issue', description: '', projectId: 5, projectName: '', category: '' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/issues');
	assert.deepStrictEqual(r.body, { summary: 'Test issue', project: { id: 5 } });
});

// 3. Create issue - full
check('createAnIssue full maps all documented fields', () => {
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

// 4. Update issue - partial
check('updateAnIssue PATCHes only provided fields', () => {
	const r = buildRequest('updateAnIssue', {
		issueId: 42, summary: '', description: '', category: '',
		additionalFields: { status: 'resolved', resolution: 'fixed', sticky: 'false' },
	});
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/issues/42');
	assert.deepStrictEqual(r.body, { status: { name: 'resolved' }, resolution: { name: 'fixed' }, sticky: false });
});

check('updateAnIssue with untouched collection sends empty body', () => {
	const r = buildRequest('updateAnIssue', { issueId: 42, summary: '', description: '', category: '' });
	assert.deepStrictEqual(r.body, {});
});

// 5. Issue note
check('createAnIssueNote with time tracking', () => {
	const r = buildRequest('createAnIssueNote', { issueId: 42, text: 'Worked on it', viewState: 'private', timeTracking: '01:30' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/issues/42/notes');
	assert.deepStrictEqual(r.body, { text: 'Worked on it', view_state: { name: 'private' }, time_tracking: { duration: '01:30' } });
});

// 6. Project create/update
check('createProject', () => {
	const r = buildRequest('createProject', { name: 'New Project', description: '', status: 'development', enabled: true, viewState: '', inheritGlobal: true, filePath: '' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/projects/');
	assert.deepStrictEqual(r.body, { name: 'New Project', status: { name: 'development' }, enabled: true, inherit_global: true });
});

check('updateProject tri-state booleans', () => {
	const r = buildRequest('updateProject', { projectId: 7, name: '', description: 'd', status: '', enabled: 'false', viewState: '', inheritGlobal: '', filePath: '' });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/projects/7');
	assert.deepStrictEqual(r.body, { description: 'd', enabled: false });
});

// 7. Versions
check('createProjectVersion', () => {
	const r = buildRequest('createProjectVersion', { projectId: 7, name: 'v1.0.0', description: '', released: false, obsolete: false, timestamp: '2026-01-01' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/projects/7/versions');
	assert.deepStrictEqual(r.body, { name: 'v1.0.0', released: false, obsolete: false, timestamp: '2026-01-01' });
});

check('updateProjectVersion partial', () => {
	const r = buildRequest('updateProjectVersion', { projectId: 7, versionId: 3, name: '', description: '', released: 'true', obsolete: '', timestamp: '' });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/projects/7/versions/3');
	assert.deepStrictEqual(r.body, { released: true });
});

// 8. Sub-projects
check('addSubProject by name', () => {
	const r = buildRequest('addSubProject', { projectId: 1, subProjectId: null, subProjectName: 'Sub', inheritParent: true });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/projects/1/subprojects');
	assert.deepStrictEqual(r.body, { project: { name: 'Sub' }, inherit_parent: true });
});

check('updateSubProject', () => {
	const r = buildRequest('updateSubProject', { projectId: 1, subProjectId: 9, inheritParent: false });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/projects/1/subprojects/9');
	assert.deepStrictEqual(r.body, { inherit_parent: false });
});

// 9. Project users
check('projectAddOrUpdateUser by username', () => {
	const r = buildRequest('projectAddOrUpdateUser', { projectId: 1, userId: null, username: 'bob', accessLevel: 'developer' });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/projects/1/users');
	assert.deepStrictEqual(r.body, { user: { name: 'bob' }, access_level: { name: 'developer' } });
});

check('getProjectUsers / handlers URLs', () => {
	assert.strictEqual(buildRequest('getProjectUsers', { projectId: 2 }).url, '/projects/2/users');
	assert.strictEqual(buildRequest('getProjectUsersThatCanBeAssignedIssues', { projectId: 2 }).url, '/projects/2/handlers');
});

// 10. Users
check('createUser', () => {
	const r = buildRequest('createUser', { username: 'bob', password: 'secret', realName: '', email: 'b@x.com', accessLevel: 'reporter', enabled: true, protected: false });
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.url, '/users/');
	assert.deepStrictEqual(r.body, { username: 'bob', password: 'secret', email: 'b@x.com', access_level: { name: 'reporter' }, enabled: true, protected: false });
});

check('updateUser partial', () => {
	const r = buildRequest('updateUser', { userId: 3, username: '', password: '', realName: 'Bob', email: '', accessLevel: '', enabled: '', protected: 'true' });
	assert.strictEqual(r.method, 'PATCH');
	assert.strictEqual(r.url, '/users/3');
	assert.deepStrictEqual(r.body, { real_name: 'Bob', protected: true });
});

// 11. End-to-end over HTTP against a mock server (proves axios-compatible option shapes)
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
		results.push('PASS  e2e mock HTTP request (POST /api/rest/issues, raw-token auth)');
	} catch (e) {
		results.push('FAIL  e2e mock HTTP request -> ' + e.message);
		process.exitCode = 1;
	} finally {
		server.close();
		console.log(results.join('\n'));
		console.log(process.exitCode ? '\nSOME TESTS FAILED' : '\nALL ' + results.length + ' CHECKS PASSED');
	}
});
