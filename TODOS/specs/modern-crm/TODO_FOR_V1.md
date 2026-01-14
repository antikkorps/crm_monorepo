# TODO TO V1.1

## References

```bash
TODOS/specs/modern-crm/tasks.md
```

## deployment done

- [x] 2026-01-08: v1 is deployed

## date: 2026-01-08

### Context

we are almost done to v1 but still have some elements to prepare

### TODO

- [ ] In institution timeline add lazy-loading of timeline
- [ ] "Se souvenir de moi" on login page (make it useful)
- [ ] correct the tests which are not passing (mock database connexions in order to not have to set up a test database)
- [ ] Search functionnality to set up (meilisearch dockerize? which is best option ?)
- [ ] component back to dashboard to implement on all pages
- [x] missing translation in fr.json for TeamActivityFeed.vue
- [x] It seems that there is an issue with socket.io for the notifications (debug => one task with an issue tomorrow not appearing in notification center)
- [ ] While adding a team member to a team, before typing it loads a list with every user... a bit confusing before typing
- [ ] Polish some style in creating invoice and quotes => specifically the catalogue background color which is not very beautiful
- [x] A validation message for the resetting password is perhaps not the best option. We should validate live during the user typing and live comparing the two inputs...
- [x] SQL Error on /billing/analytics (fixed with migration + SQL query correction)
- [ ] Tests: Protection auto-lock (task 31.3 from tasks.md) - Ensure data protection system reliability
- [x] Fix: Dashboard team card click not working (SCSS build error in AddTeamMemberDialog.vue and TeamMemberCard.vue - converted to CSS)
- [ ] Verify production monitoring and logging configuration (from task 19.2)

### Decision
