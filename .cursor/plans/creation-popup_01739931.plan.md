---
name: creation-popup
overview: Move creation editor into a closable popup on the project page, driven by frontend state (creation_id) instead of URL, and add draggable resizing for the popup’s columns.
todos:
  - id: refactor-creation-editor
    content: Refactor CreationEditorPage to accept projectId/creationId props with URL wrapper.
    status: completed
  - id: add-popup-state
    content: Add popup component and state in project page, hook StudioColumn to open it.
    status: completed
  - id: resize-columns
    content: Implement drag handles for column width/height in the popup layout.
    status: completed
isProject: false
---

- Update creation editor to accept explicit `projectId`/`creationId` props and keep a thin URL-based wrapper for the existing route (so direct navigation still works).
  - Target: [src/app/components/creation/CreationEditorPage.tsx](src/app/components/creation/CreationEditorPage.tsx) currently pulls ids from `useParams`.
- Introduce a creation popup component that renders over the project page and can be closed without changing the URL.
  - Target: add a new component like [src/app/components/creation/CreationEditorModal.tsx](src/app/components/creation/CreationEditorModal.tsx) and reuse `CreationEditorPage` inside.
  - Popup state lives in [src/app/project/[project_id]/page.tsx](src/app/project/[project_id]/page.tsx) since it owns the main layout.
- Wire Studio interactions to open the popup and keep `creationId` in local state instead of `router.push`.
  - Target: [src/app/components/home/StudioColumn.tsx](src/app/components/home/StudioColumn.tsx) `handleCreated` and saved-note click handlers now call `onOpenCreation(creationId)` instead of navigation.
- Add draggable resize behavior for popup columns (horizontal between columns, vertical per column) and persist sizes in local state while popup is open.
  - Implement simple mouse handlers with min/max bounds; avoid new dependencies.
  - Apply to the popup layout only, so main page layout remains unchanged.

