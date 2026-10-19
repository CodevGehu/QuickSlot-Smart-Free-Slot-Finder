# Ordered local pull requests

These are local review packages, not published GitHub pull requests. Branches are stacked and should merge in this order. Labels are merge sequence numbers, not assigned GitHub PR numbers.

| Order | Branch | Base | Description |
| --- | --- | --- | --- |
| 01 | codex/01-rebuild-plan | main | [Architecture](01-architecture.md) |
| 02 | codex/02-clean-foundation | codex/01-rebuild-plan | [Foundation](02-foundation.md) |
| 03 | codex/03-spring-learning-guide | codex/02-clean-foundation | [Learning guide](03-learning-guide.md) |
| 04 | codex/04-spring-backend | codex/03-spring-learning-guide | [Spring backend](04-spring-backend.md) |
| 05 | codex/05-timetable-imports | codex/04-spring-backend | [Timetables](05-timetables.md) |
| 06 | codex/06-campus-interface | codex/05-timetable-imports | [Interface](06-interface.md) |
| 07 | codex/07-source-inventory | codex/06-campus-interface | [Source inventory](07-source-inventory.md) |
| 08 | codex/08-integration-and-delivery | codex/07-source-inventory | [Delivery](08-delivery.md) |
| 09 | codex/09-room-presentation | codex/08-integration-and-delivery | [Room presentation](09-room-presentation.md) |
| 10 | codex/10-club-membership | codex/09-room-presentation | [Clubs and membership](10-club-membership.md) |

Use [01], [02] and so on as title prefixes when a maintainer can push these branches. Keep the immediate predecessor as the base during review. After merging a predecessor, retarget its successor to main. Preserve predecessor commits or coordinate a rebase; squash-merging a stacked branch without rebasing successors can duplicate diffs.

No remote writes were attempted because push access is unavailable. A maintainer with permission must push the branches before GitHub PRs can be created. Review each branch locally with git diff BASE...BRANCH.
