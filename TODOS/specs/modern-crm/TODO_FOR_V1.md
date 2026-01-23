# TODO TO V1.1

## References

```bash
TODOS/specs/modern-crm/tasks.md
```

## deployment done

- [x] 2026-01-08: v1 is deployed

## date: 2026-01-14

### Context

we are almost done to v1 but still have some elements to prepare

### TODO

- [x] In institution timeline add lazy-loading of timeline (+ i18n complet + filtres corrigés + indicateurs de pagination)
- [x] "Se souvenir de moi" on login page (make it useful)
- [ ] correct the tests which are not passing (mock database connexions in order to not have to set up a test database)
- [ ] Search functionnality to set up (meilisearch dockerize? which is best option ?)
- [ ] component back to dashboard to implement on all pages
- [x] missing translation in fr.json for TeamActivityFeed.vue
- [x] It seems that there is an issue with socket.io for the notifications (debug => one task with an issue tomorrow not appearing in notification center)
- [x] While adding a team member to a team, before typing it loads a list with every user... a bit confusing before typing
- [x] Polish some style in creating invoice and quotes => specifically the catalogue background color which is not very beautiful (fixed: gradient background + modern header styling)
- [x] A validation message for the resetting password is perhaps not the best option. We should validate live during the user typing and live comparing the two inputs...
- [x] SQL Error on /billing/analytics (fixed with migration + SQL query correction)
- [ ] Tests: Protection auto-lock (task 31.3 from tasks.md) - Ensure data protection system reliability
- [ ] Test: Import institution via Excel (vérifier le fonctionnement de l'import)
- [x] Fix: Dashboard team card click not working (SCSS build error in AddTeamMemberDialog.vue and TeamMemberCard.vue - converted to CSS)
- [ ] Verify production monitoring and logging configuration (from task 19.2)
- [x] action type verification failed due to missing share folder (fixed: CI now builds shared package before type-check)
- [x] erreur lors de la récupération du catalogue d'articles (fixed with migration + SQL query correction)
- [ ] UserProfileForm => integrate i18n and traduction. Ensure that it checks the user's rights to create or update a user + ts_errors.
- [ ] Segmentation: polish UX et expérience utilisateur
  - [x] SavedSegmentsManager: fix search field and reload button alignment (desktop + mobile responsive)
  - [x] SavedSegmentsManager: refactor bulk actions bar (floating card instead of bottom sheet, X button clears selection, mobile-first design with icon-only buttons on small screens)
  - [x] SavedSegmentsManager: reduce padding on mobile, shorter button text ("Nouveau segment" on mobile)
  - [x] SegmentAnalyticsDashboard: fix metric cards overflow (1 col mobile, 2 cols tablet/md, 4 on lg), fix time filter visibility on mobile
  - [x] SegmentationView: add margin-top on create button (mobile only)
  - [x] Vérifier le bon fonctionnement général de la segmentation (nettoyage code mort: vennDiagram, attributeChart stub, fix compteur segments)
- [x] in the sell pipeline the dropdown which is supposed to show the medical institutions is not working (no data available) - Fixed: load 20 institutions on focus + hint message
- [x] Export opportunities to CSV/XLSX/JSON + Stats by collaborator display in OpportunitiesView + ExportCenter integration
- [x] Fix: OpportunitiesView responsive layout (mobile-first) - removed min-width constraints causing overflow, fixed pipeline columns (4 cols desktop, 2 tablet, 1 mobile)
- [x] Fix: Export invalid file - generateXLSX was returning empty buffer for empty data, now returns valid empty workbook
- [x] Fix: PDF generation error without template - now returns clear user message instead of crashing (422 status with "Aucun modèle de document n'est configuré...")

### Decision
