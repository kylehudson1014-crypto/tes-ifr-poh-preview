# v16 shared data model (Firestore, project tes-ifr-f5e73, free Spark plan)

All school data lives under `/schools/{school}/…`. Every synced record uses one envelope:
`{uid, sid, kind, updated (ms), del (bool), json (string)}` (+ `rv` on logbook entries).

| Collection | Doc id | Written by | Read by | Contents (`json`) |
|---|---|---|---|---|
| `book` | booking id | staff (CFII, admin, safety, maintenance) | staff; the student it belongs to (`uid`) | a Scheduling booking (date, start/end, student, CFII, tail, lesson, status, history) |
| `acct` | student slug | admin | admin; that student | `{name, pk (package), use[], led[]}` — hours package, usage and ledger |
| `lbk` | flight id | the student (creates as `rv:"pending"`) | the student; staff | a logbook entry; staff set `rv` to `approved` / `returned` (+ note) |
| `prog` | student uid | the student | the student; staff | visual-lesson progress |
| `dir` | `members` | admin | staff | name → uid directory, used to link bookings/accounts to students |

Existing collections (members, codes, safety, safebox, push, config, escal, alertlog) are unchanged.

## Migration from device-local data
Admin portal → **🗄 DATA** → *Download backup* (JSON safety copy) → *Upload this device's records*.
That publishes the member directory, then force-pushes every booking and account from this device,
linking each to the student's uid by name. Students' logbooks upload from their own device on next sync.
Nothing local is deleted; sync is hash-diff, so offline edits upload when back online.

## Builds
`python3 tools/build_split.py <out>` → `<out>/admin` (School Admin portal) and `<out>/lessons/docs` (IFR Lessons).
Same source, `window.TES_BUILD` selects the area. The combined app (this repo) still works as before.
