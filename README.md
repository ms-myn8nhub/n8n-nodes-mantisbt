# n8n-nodes-mantisbt

This is an n8n community node. It lets you use **MantisBT** in your n8n workflows.

**MantisBT** is an open-source, web-based bug tracking system written in PHP, supporting MySQL/MariaDB and PostgreSQL, with role-based access control, email notifications, plugin support, and integration capabilities via REST API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Implementation](#implementation)  
[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)

## Fork changes (v0.2.0)

This fork fixes the two connection-breaking bugs of v0.1.3 and implements the
create/update operations of the [MantisBT REST API](https://documenter.getpostman.com/view/29959/mantis-bug-tracker-rest-api/7Lt6zkP).

**Fixes**

1. `requestDefaults.baseURL` was hardcoded to `http://localhost:8989/api/rest`
   (a leftover dev mock server), so every node execution failed with
   `ECONNREFUSED 127.0.0.1:8989` no matter what Base URL the credential had.
   It now resolves from the credential: `={{$credentials.baseUrl}}/api/rest`.
2. Routing URLs containing `{{ ... }}` expressions were missing the leading
   `=` required by n8n, so they were sent to the server as literal text
   (e.g. `/issues/{{ $parameter.issueId }}`). All are prefixed now.
3. `NodeConnectionType.Main` was referenced as a value; recent `n8n-workflow`
   versions export it as a type only. Replaced with the equivalent `'main'`
   string literal (same compiled output as before).

**New operations** (see status tables below): Create/Update Issue, Create
Issue Note (with optional time tracking), Create/Update Project,
Create/Update Project Version, Add/Update Sub-Project, Get Project Users,
Get Assignable Users, Add/Update Project User, Create/Update User. The
`Users` and `Issue Notes` resources are now enabled in the UI.

**Known limitations**

- File attachments (issue files / note attachments) are not implemented yet:
  they require binary-to-base64 handling that declarative routing cannot
  currently express reliably. Use n8n's HTTP Request node for those endpoints.
- Delete operations, filters, config, lang, user tokens and impersonation are
  still work in progress.
- Enum fields (priority, severity, status, ...) offer the standard MantisBT
  labels; if your instance customizes them, set the field via an expression.

**Testing**: `npm run build && node tools/smoke-test.js` verifies (99 checks):
field visibility per resource/operation via n8n's real `displayParameter`,
`$parameter` coverage of every routing expression, absence of nested
(non-rendered) option fields, request method/URL/body/qs resolution, and an
end-to-end request against a mock server.

## Implementation status

### Issues

| Endpoint                               | Implemented | Omitted | Note            | Tested |
| -------------------------------------- | ----------- | ------- | --------------- | ------ |
| Get an issue                           |             | x       | merged into one |        |
| Get an issue (specific fields)         | x           |         |                 |        |
| Get issue files                        | x           |         |                 |        |
| Get issue file (single)                | x           |         |                 |        |
| Get all issues                         |             | x       | merged into one | x      |
| Get all issues (specified fields)      | x           |         |                 |        |
| Get issues for a project               |             | x       | merged into one |        |
| Get issues matching filter             |             | x       | merged into one |        |
| Get issues assigned to me              |             | x       | merged into one |        |
| Get issues reported by me              |             | x       | merged into one |        |
| Get issues monitored by me             |             | x       | merged into one |        |
| Get unassigned issues                  |             | x       | merged into one |        |
| Create an issue (minimal)              |             | x       | merged into one | x      |
| Create an issue                        | x           |         |                 | x      |
| Create an issue with attachments       |             | x       | binary data     |        |
| Update an issue (minimal)              |             | x       | merged into one | x      |
| Update an issue                        | x           |         |                 | x      |
| Delete an issue                        |             |         |                 |        |
| Monitor an issue                       |             |         |                 |        |
| Monitor an issue (for specified users) |             |         |                 |        |
| Attach a tag to issue                  |             |         |                 |        |
| Detach a tag from an issue             |             |         |                 |        |
| Add an issue relationship              |             |         |                 |        |
| Delete an issue relationship           |             |         |                 |        |

### Issue Notes and Attachments

| Endpoint                                | Implemented | Omitted | Note | Tested |
| --------------------------------------- | ----------- | ------- | ---- | ------ |
| Create an issue note                    | x           |         |      | x      |
| Create an issue note with time tracking |             | x       | merged into one | x      |
| Create an issue note with attachment    |             | x       | binary data |        |
| Delete an issue note                    |             |         |      |        |
| Add attachments to issue                |             |         |      |        |

### Projects

| Endpoint         | Implemented | Omitted | Note | Tested |
| ---------------- | ----------- | ------- | ---- | ------ |
| Project Users    | x           |         | get users, assignable users, add/update user | x      |
| Project Versions | x           |         | get all, get one, create, update | x      |
| Sub-Projects     | x           |         | add, update | x      |
| Get all projects | x           |         |      |        |
| Get a project    | x           |         |      |        |
| Create a project | x           |         |      | x      |
| Update a project | x           |         |      | x      |
| Delete a project |             |         |      |        |

### Filters

| Endpoint        | Implemented | Omitted | Note | Tested |
| --------------- | ----------- | ------- | ---- | ------ |
| Get all filters |             |         |      |        |
| Get a filter    |             |         |      |        |
| Delete a filter |             |         |      |        |

### Users

| Endpoint                  | Implemented | Omitted | Note            | Tested |
| ------------------------- | ----------- | ------- | --------------- | ------ |
| Get My User Info          |             | x       | merged into one |        |
| Get My User Info (select) | x           |         |                 |        |
| Get User By Id            |             | x       | merged into one |        |
| Get User By Id (select)   | x           |         |                 |        |
| Get User By Username      |             |         |                 |        |
| Create a user             | x           |         |                 | x      |
| Create a user (minimal)   |             | x       | merged into one | x      |
| Update User               | x           |         |                 | x      |
| Reset user password       |             |         |                 |        |
| Delete a user             |             |         |                 |        |

### User Tokens

| Endpoint              | Implemented | Omitted | Note | Tested |
| --------------------- | ----------- | ------- | ---- | ------ |
| Create token for me   |             |         |      |        |
| Delete token for me   |             |         |      |        |
| Create token for user |             |         |      |        |
| Delete token for user |             |         |      |        |

### Config

| Endpoint                           | Implemented | Omitted | Note | Tested |
| ---------------------------------- | ----------- | ------- | ---- | ------ |
| Get Configuration Option           |             |         |      |        |
| Get Multiple Configuration Options |             |         |      |        |
| Set Configs                        |             |         |      |        |

### Lang

| Endpoint                       | Implemented | Omitted | Note | Tested |
| ------------------------------ | ----------- | ------- | ---- | ------ |
| Get a localized string         |             |         |      |        |
| Get multiple localized strings |             |         |      |        |

### Pages

| Endpoint            | Implemented | Omitted | Note | Tested |
| ------------------- | ----------- | ------- | ---- | ------ |
| Get Issue View Page | x           |         |      |        |

### Impersonation

| Endpoint                            | Implemented | Omitted | Note | Tested |
| ----------------------------------- | ----------- | ------- | ---- | ------ |
| Get My User Info with Impersonation |             |         |      |        |

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Issues**: Get an issue, Get all issues (filter/pagination/select fields), Get issue files/file, **Create an issue**, **Update an issue** (PATCH semantics - only filled fields change)
- **Issue Notes**: **Create an issue note** (optional view state and time tracking)
- **Projects**: Get all/one, **Create**, **Update**
- **Project Versions**: Get all/one, **Create**, **Update**
- **Sub-Projects**: **Add**, **Update** (inherit-parent flag)
- **Project Users**: **Get project users**, **Get assignable users (handlers)**, **Add or update project user**
- **Users**: Get me / by ID / by username, **Create**, **Update**
- **Pages**: Get issue view page

## Credentials

- **Base URL**: the MantisBT instance root, e.g. `https://mantisbt.example.com` - **without** `/api/rest` and **without** a trailing slash (the node appends `/api/rest` itself).
- **API Token**: create one in MantisBT under *My Account > API Tokens*. It is sent as the raw `Authorization` header value - MantisBT does **not** accept the `Bearer ` prefix.

## Compatibility

_State the minimum n8n version, as well as which versions you test against. You can also include any known version incompatibility issues._

## Usage

_This is an optional section. Use it to help users with any difficult or confusing aspects of the node._

_By the time users are looking for community nodes, they probably already know n8n basics. But if you expect new users, you can link to the [Try it out](https://docs.n8n.io/try-it-out/) documentation to help them get started._

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [MantisBT website](https://mantisbt.org/)
- [MantisBT documentation](https://mantisbt.org/documentation.php)

## Version history

- **0.2.1** - **fix invisible input fields**: operation fields were nested inside
  operation option entries (`INodePropertyOptions.options`), which the n8n editor
  never renders; all fields are now top-level properties gated by
  `displayOptions` (the standard declarative-node pattern). Also fixes two
  upstream parameter-name mismatches (`select` vs `$parameter.selectFields`,
  `filterId` vs `$parameter.filter`) that made "Select Fields" and "Filter"
  inputs silently ineffective, and shows Select Fields for Get User By Username.
  Adds UI-visibility assertions (using n8n's own `displayParameter`) to the
  smoke test: 99 checks.
- **0.2.0** - fix hardcoded `localhost:8989` baseURL and unresolved URL expressions; add create/update operations for issues, notes, projects, versions, sub-projects, project users and users; enable Users and Issue Notes resources; smoke-test tooling.
- **0.1.3** - upstream (GET operations only; not connectable due to the baseURL bug).
