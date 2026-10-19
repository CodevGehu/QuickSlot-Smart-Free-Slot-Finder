# PR 11 Interface refinement and club presentation

Base: codex/10-club-membership
Branch: codex/11-interface-refinement

Removes public Needs verification badges/counts/filter without declaring incomplete schedules free. Guest requests retain their selected room and whole-hour slot through sign-in. Enlarges dark text and buttons, strengthens the Aarambh purple accent, and replaces native dropdowns with a consistent accessible selection control across search, booking, rooms, requests, teachers and timetable review. Multi-faculty assignment uses touch-friendly checkboxes.

Co-Dev uses the exact supplied logo file with its white background preserved and a border frame. The faculty coordinator is separate from the 15-member core team. The committee attribution is removed from the profile; source provenance stays in documentation.

Validation: production build passed; 22 desktop/mobile browser checks passed after the dropdown rollout, including keyboard selection, required form values, real API submission, role workflows and guest sign-in continuation. The existing 24 Java tests remain applicable because backend code is unchanged. Logo bytes match the supplied file.
