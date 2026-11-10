# Test ids

Every interactive element and every element a test would assert on has a stable `data-testid`.
This file is **generated** from [`web/src/lib/testids.ts`](../web/src/lib/testids.ts) (`npm run docs:testids`);
edit the source, not this table. The E2E repo (`playwright-jenkins-e2e`) selects by these ids.

## Conventions

- Kebab-case: `<area>-<element>[-<qualifier>]`.
- Ids with a `{placeholder}` are builders. Substitute the entity id or status value (`task-card-{id}` becomes `task-card-k3j9x0a1b2cd`).
- State is exposed as data attributes next to the id, so tests can assert it without parsing text:

| Element                 | Attributes                                     |
| ----------------------- | ---------------------------------------------- |
| `task-card-{id}`        | `data-status`, `data-priority`, `data-overdue` |
| `task-row-{id}`         | `data-status`, `data-priority`, `data-overdue` |
| `board-column-{status}` | `data-count`                                   |
| `stat-card-{name}`      | `data-value`                                   |

- Forms: `{form}-{field}-input`, `{form}-{field}-error` (inline validation), `{form}-submit`, `{form}-error` (server error).
  Example: `login-email-input`, `login-password-error`, `login-submit`.
- Toasts: `toast-success` / `toast-error`.
- The board "Move to" menu uses `task-move-{id}` and `task-move-{id}-{status}`, so `task-card-*` only ever matches cards.

## All ids

### activity

| Id              | Key in `tid`       |
| --------------- | ------------------ |
| `activity-{id}` | `tid.activityItem` |
| `activity-list` | `tid.activityList` |

### board

| Id                      | Key in `tid`          |
| ----------------------- | --------------------- |
| `board-view`            | `tid.boardView`       |
| `board-column-dots`     | `tid.boardColumnDots` |
| `board-column-{status}` | `tid.boardColumn`     |
| `board-add-{status}`    | `tid.boardAdd`        |

### bottom

| Id           | Key in `tid`    |
| ------------ | --------------- |
| `bottom-nav` | `tid.bottomNav` |

### command

| Id                      | Key in `tid`              |
| ----------------------- | ------------------------- |
| `command-palette`       | `tid.commandPalette`      |
| `command-palette-input` | `tid.commandPaletteInput` |
| `command-item-{name}`   | `tid.commandItem`         |

### comment

| Id                    | Key in `tid`        |
| --------------------- | ------------------- |
| `comment-input`       | `tid.commentInput`  |
| `comment-submit`      | `tid.commentSubmit` |
| `comment-{id}`        | `tid.comment`       |
| `comment-delete-{id}` | `tid.commentDelete` |

### confirm

| Id                       | Key in `tid`               |
| ------------------------ | -------------------------- |
| `confirm-dialog`         | `tid.confirmDialog`        |
| `confirm-dialog-confirm` | `tid.confirmDialogConfirm` |
| `confirm-dialog-cancel`  | `tid.confirmDialogCancel`  |
| `confirm-dialog-input`   | `tid.confirmDialogInput`   |

### dashboard

| Id               | Key in `tid`        |
| ---------------- | ------------------- |
| `dashboard-page` | `tid.dashboardPage` |

### empty

| Id                   | Key in `tid`     |
| -------------------- | ---------------- |
| `empty-state-{name}` | `tid.emptyState` |

### error

| Id                   | Key in `tid`     |
| -------------------- | ---------------- |
| `error-state-{name}` | `tid.errorState` |

### filter

| Id                        | Key in `tid`         |
| ------------------------- | -------------------- |
| `filter-search-input`     | `tid.filterSearch`   |
| `filter-status-select`    | `tid.filterStatus`   |
| `filter-priority-select`  | `tid.filterPriority` |
| `filter-assignee-select`  | `tid.filterAssignee` |
| `filter-overdue-checkbox` | `tid.filterOverdue`  |
| `filter-clear`            | `tid.filterClear`    |

### filters

| Id               | Key in `tid`        |
| ---------------- | ------------------- |
| `filters-toggle` | `tid.filtersToggle` |

### forms

| Id                    | Key in `tid`     |
| --------------------- | ---------------- |
| `{form}-{name}-input` | `tid.field`      |
| `{form}-{name}-error` | `tid.fieldError` |
| `{form}-submit`       | `tid.submit`     |
| `{form}-error`        | `tid.formError`  |

### invite

| Id                   | Key in `tid`       |
| -------------------- | ------------------ |
| `invite-row-{id}`    | `tid.inviteRow`    |
| `invite-revoke-{id}` | `tid.inviteRevoke` |

### landing

| Id                    | Key in `tid`            |
| --------------------- | ----------------------- |
| `landing-demo-button` | `tid.landingDemoButton` |
| `landing-login-link`  | `tid.landingLoginLink`  |
| `landing-signup-link` | `tid.landingSignupLink` |

### list

| Id          | Key in `tid`   |
| ----------- | -------------- |
| `list-view` | `tid.listView` |

### login

| Id                  | Key in `tid`    |
| ------------------- | --------------- |
| `login-demo-{kind}` | `tid.demoLogin` |

### member

| Id                   | Key in `tid`       |
| -------------------- | ------------------ |
| `member-row-{id}`    | `tid.memberRow`    |
| `member-remove-{id}` | `tid.memberRemove` |
| `member-role-{id}`   | `tid.memberRole`   |

### my

| Id                      | Key in `tid`       |
| ----------------------- | ------------------ |
| `my-tasks-page`         | `tid.myTasksPage`  |
| `my-tasks-group-{name}` | `tid.myTasksGroup` |
| `my-tasks-list`         | `tid.myTasksList`  |

### nav

| Id                | Key in `tid`  |
| ----------------- | ------------- |
| `nav-link-{name}` | `tid.navLink` |

### new

| Id                   | Key in `tid`           |
| -------------------- | ---------------------- |
| `new-project-button` | `tid.newProjectButton` |
| `new-project-form`   | `tid.newProjectForm`   |
| `new-task-button`    | `tid.newTaskButton`    |
| `new-task-form`      | `tid.newTaskForm`      |

### not

| Id               | Key in `tid`       |
| ---------------- | ------------------ |
| `not-found-page` | `tid.notFoundPage` |
| `not-found-home` | `tid.notFoundHome` |

### overdue

| Id             | Key in `tid`      |
| -------------- | ----------------- |
| `overdue-list` | `tid.overdueList` |

### project

| Id                      | Key in `tid`              |
| ----------------------- | ------------------------- |
| `project-link-{id}`     | `tid.projectLink`         |
| `project-page`          | `tid.projectPage`         |
| `project-title`         | `tid.projectTitle`        |
| `project-delete`        | `tid.projectDelete`       |
| `project-settings-page` | `tid.projectSettingsPage` |

### retry

| Id             | Key in `tid` |
| -------------- | ------------ |
| `retry-{name}` | `tid.retry`  |

### search

| Id               | Key in `tid`        |
| ---------------- | ------------------- |
| `search-trigger` | `tid.searchTrigger` |

### settings

| Id                    | Key in `tid`       |
| --------------------- | ------------------ |
| `settings-page`       | `tid.settingsPage` |
| `settings-tab-{name}` | `tid.settingsTab`  |

### shortcuts

| Id                 | Key in `tid`          |
| ------------------ | --------------------- |
| `shortcuts-dialog` | `tid.shortcutsDialog` |

### sidebar

| Id               | Key in `tid`        |
| ---------------- | ------------------- |
| `sidebar`        | `tid.sidebar`       |
| `sidebar-toggle` | `tid.sidebarToggle` |

### skeleton

| Id                | Key in `tid`   |
| ----------------- | -------------- |
| `skeleton-{name}` | `tid.skeleton` |

### sort

| Id             | Key in `tid`     |
| -------------- | ---------------- |
| `sort-{field}` | `tid.sortHeader` |

### stat

| Id                 | Key in `tid`   |
| ------------------ | -------------- |
| `stat-card-{name}` | `tid.statCard` |

### tab

| Id             | Key in `tid`      |
| -------------- | ----------------- |
| `tab-board`    | `tid.tabBoard`    |
| `tab-list`     | `tid.tabList`     |
| `tab-settings` | `tid.tabSettings` |

### task

| Id                           | Key in `tid`                 |
| ---------------------------- | ---------------------------- |
| `task-link-{id}`             | `tid.taskLink`               |
| `task-card-{id}`             | `tid.taskCard`               |
| `task-move-{id}`             | `tid.taskCardMove`           |
| `task-move-{id}-{status}`    | `tid.taskCardMoveTo`         |
| `task-row-{id}`              | `tid.taskRow`                |
| `task-panel`                 | `tid.taskPanel`              |
| `task-panel-close`           | `tid.taskPanelClose`         |
| `task-title-input`           | `tid.taskTitle`              |
| `task-status-select`         | `tid.taskStatus`             |
| `task-priority-select`       | `tid.taskPriority`           |
| `task-assignee-select`       | `tid.taskAssignee`           |
| `task-due-input`             | `tid.taskDue`                |
| `task-labels`                | `tid.taskLabels`             |
| `task-label-{id}`            | `tid.taskLabelToggle`        |
| `task-description-input`     | `tid.taskDescription`        |
| `task-description-preview`   | `tid.taskDescriptionPreview` |
| `task-description-tab-{tab}` | `tid.taskDescriptionTab`     |
| `task-description-save`      | `tid.taskDescriptionSave`    |
| `task-delete`                | `tid.taskDelete`             |
| `task-menu`                  | `tid.taskMenu`               |

### theme

| Id                    | Key in `tid`      |
| --------------------- | ----------------- |
| `theme-toggle`        | `tid.themeToggle` |
| `theme-option-{name}` | `tid.themeOption` |

### toast

| Id              | Key in `tid`       |
| --------------- | ------------------ |
| `toast-success` | `tid.toastSuccess` |
| `toast-error`   | `tid.toastError`   |

### user

| Id                   | Key in `tid`           |
| -------------------- | ---------------------- |
| `user-menu`          | `tid.userMenu`         |
| `user-menu-logout`   | `tid.userMenuLogout`   |
| `user-menu-settings` | `tid.userMenuSettings` |
| `user-row-{id}`      | `tid.userRow`          |
| `user-delete-{id}`   | `tid.userDelete`       |
