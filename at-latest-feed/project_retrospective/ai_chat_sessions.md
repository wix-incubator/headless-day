# AI chat session history (Claude Desktop, Codex, Cursor)

Target project folders:
- `Wix/sandbox-for-testing/headless/dev-rel-web-trends-and-insights`
- `Wix/sandbox-for-testing/headless/dev-rel-web-trends-and-insights-staging`

## What I searched (path + keyword)
I looked for “chat session / history” artifacts in each app’s local storage, using:
- **Path lookup**: locate likely session-history files/directories in app support folders
- **Keyword lookup**: search *text-like* session files for the project folder identifiers above

Note: some apps store chat history in **SQLite / binary** formats, so keyword lookup may not find matches even if the chat is related to the target folders.

---

## Codex (CLI / Codex app storage)

### Confirmed keyword matches
Keyword searched for:
- `dev-rel-web-trends-and-insights-staging`
- `dev-rel-web-trends-and-insights`

Files matched for `dev-rel-web-trends-and-insights-staging`:
- `/Users/omerse/.codex/process_manager/chat_processes.json`
- `/Users/omerse/.codex/sessions/2026/07/06/rollout-2026-07-06T09-18-00-019f3613-93e3-7f62-afaa-596e5d16ee1d.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/09/rollout-2026-07-09T22-19-53-019f4852-7f2b-7460-b470-69dca28a9deb.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/09/rollout-2026-07-09T15-37-05-019f46e1-b6be-77c1-ab6a-af5c0bb5ff01.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/09/rollout-2026-07-09T13-28-11-019f466b-b321-7f70-866f-baddae86bfd9.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/07/rollout-2026-07-07T16-48-39-019f3cd6-84b4-7823-98a7-bd8ec65c2fff.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/07/rollout-2026-07-07T15-04-56-019f3c77-9215-7e62-948a-c0851b8d2694.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/06/rollout-2026-07-06T10-12-03-019f3645-0e7a-74f0-8690-1c6c28b4245d.jsonl`
- `/Users/omerse/.codex/attachments/pasted-text-attachments.json`
- `/Users/omerse/.codex/attachments/3ae67634-bc0b-46ed-a2ac-628506835d38/pasted-text.txt`
- `/Users/omerse/.codex/attachments/b0cb5550-988b-466f-9631-805981d8b184/pasted-text.txt`
- `/Users/omerse/.codex/attachments/c3afc176-812c-4b25-8beb-c15183a1379a/pasted-text.txt`

Files matched for `dev-rel-web-trends-and-insights` (broader match includes non-staging sessions too):
- `/Users/omerse/.codex/.codex-global-state.json`
- `/Users/omerse/.codex/process_manager/chat_processes.json`
- `/Users/omerse/.codex/sessions/2026/07/06/rollout-2026-07-06T09-18-00-019f3613-93e3-7f62-afaa-596e5d16ee1d.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/09/rollout-2026-07-09T22-19-53-019f4852-7f2b-7460-b470-69dca28a9deb.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/09/rollout-2026-07-09T15-37-05-019f46e1-b6be-77c1-ab6a-af5c0bb5ff01.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/09/rollout-2026-07-09T13-28-11-019f466b-b321-7f70-866f-baddae86bfd9.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/07/rollout-2026-07-07T16-48-39-019f3cd6-84b4-7823-98a7-bd8ec65c2fff.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/07/rollout-2026-07-07T15-04-56-019f3c77-9215-7e62-948a-c0851b8d2694.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/06/rollout-2026-07-06T10-12-03-019f3645-0e7a-74f0-8690-1c6c28b4245d.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/06/rollout-2026-07-06T09-20-18-019f3615-af63-7dd2-9bec-87b859e3265d.jsonl`
- `/Users/omerse/.codex/sessions/2026/07/02/rollout-2026-07-02T06-43-21-019f20ec-8c2f-7961-b632-9b17a1e11bab.jsonl`
- `/Users/omerse/.codex/sessions/2026/06/30/rollout-2026-06-30T22-40-20-019f1a0b-fbce-7811-81e6-1711de127f01.jsonl`
- `/Users/omerse/.codex/sessions/2026/06/30/rollout-2026-06-30T07-55-31-019f16e1-e64e-7730-8ed6-e5b79e52f4d0.jsonl`
- `/Users/omerse/.codex/attachments/pasted-text-attachments.json`
- `/Users/omerse/.codex/attachments/3ae67634-bc0b-46ed-a2ac-628506835d38/pasted-text.txt`
- `/Users/omerse/.codex/attachments/b0cb5550-988b-466f-9631-805981d8b184/pasted-text.txt`
- `/Users/omerse/.codex/attachments/c3afc176-812c-4b25-8beb-c15183a1379a/pasted-text.txt`

---

## Cursor

### Session storage found
Cursor chat history is stored primarily as **SQLite** `store.db` files under:
- `/Users/omerse/.cursor/chats/<chat-session-id>/*/store.db`

The following `store.db` files exist under the one chat session id directory present in `~/.cursor/chats/`:
- `/Users/omerse/.cursor/chats/305120146c07e0db14366d351ae33e26/0583bfae-5b83-4f3e-82b0-d23424b9d913/store.db`
- `/Users/omerse/.cursor/chats/305120146c07e0db14366d351ae33e26/7745af59-e1a9-4e4e-a5c3-69fdd16392f0/store.db`
- `/Users/omerse/.cursor/chats/305120146c07e0db14366d351ae33e26/fbf114ea-41ba-4137-a790-82dd9d50d85a/store.db`

Associated SQLite sidecar files also present:
- `store.db-shm`
- `store.db-wal`

### Keyword verification status
I attempted a lightweight text extraction (`strings`) + search against each `store.db` for:
- `dev-rel-web-trends-and-insights`
- `dev-rel-web-trends-and-insights-staging`

No matches were found in the extracted strings output, so I could not confirm that those specific Cursor chats are about the target folders.

---

## Claude Desktop

### Session-history files found (Claude app-support JSON)
Under Claude’s app support folder, I found session-like JSON files under:
- `.../claude-code-sessions/.../local_*.json`
- `.../local-agent-mode-sessions/.../local_*.json`

Files found:
- `/Users/omerse/Library/Application Support/Claude/claude-code-sessions/14b6de84-8bea-4e4b-b475-35809501c489/52b16a6a-9be6-4ae3-a797-f401067052b4/local_38b6a804-9c66-450d-bfc8-381b5a74a637.json`
- `/Users/omerse/Library/Application Support/Claude/claude-code-sessions/14b6de84-8bea-4e4b-b475-35809501c489/52b16a6a-9be6-4ae3-a797-f401067052b4/local_71985e52-013f-43b8-8e8c-76280c1c6302.json`
- `/Users/omerse/Library/Application Support/Claude/local-agent-mode-sessions/14b6de84-8bea-4e4b-b475-35809501c489/52b16a6a-9be6-4ae3-a797-f401067052b4/local_c86b1d21-46fe-44df-9934-fc69920199bd.json`
- `/Users/omerse/Library/Application Support/Claude/local-agent-mode-sessions/14b6de84-8bea-4e4b-b475-35809501c489/52b16a6a-9be6-4ae3-a797-f401067052b4/local_65d1f199-3bb3-4c83-9552-504d4644738d.json`
- `/Users/omerse/Library/Application Support/Claude/local-agent-mode-sessions/14b6de84-8bea-4e4b-b475-35809501c489/52b16a6a-9be6-4ae3-a797-f401067052b4/local_33530921-e238-4aef-b66a-50cbb1f8973b.json`
- `/Users/omerse/Library/Application Support/Claude/local-agent-mode-sessions/14b6de84-8bea-4e4b-b475-35809501c489/52b16a6a-9be6-4ae3-a797-f401067052b4/local_220f20f9-9236-44f9-b5ea-9daf6e409db8.json`

### Keyword verification status
I searched inside those JSON session files for:
- `dev-rel-web-trends-and-insights`
- `dev-rel-web-trends-and-insights-staging`

No matches were found in the text-searchable JSON files.

