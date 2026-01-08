# TODO TO V1.1

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
- [ ] It seems that there is an issue with socket.io for the notifications (debug => one task with an issue tomorrow not appearing in notification center)
- [x] A validation message for the resetting password is perhaps not the best option. We should validate live during the user typing and live comparing the two inputs...

### Decision
