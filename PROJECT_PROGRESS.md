# PROJECT_PROGRESS.md — moonmoon-dessert-passport

> Auto-managed sync mirror. Manual notes area is preserved.

## 🔄 Sync Mirror (Auto-Managed)

<!-- SYNC:BEGIN -->
sync_id: moonmoon_dessert_passport
project_name: moonmoon-dessert-passport
repo_path: /Users/pensoair/Desktop/網路開發專案/moonmoon-dessert-passport
obsidian_card: /Users/pensoair/Library/Mobile Documents/iCloud~md~obsidian/Documents/Penso-OS/08_專案工坊/Subdomain_passport.kiwimu.com/Dessert_Passport_專案.md
progress_file: /Users/pensoair/Desktop/網路開發專案/moonmoon-dessert-passport/PROJECT_PROGRESS.md
source_of_truth: obsidian
last_synced: 2026-03-03T19:14:01+08:00
sync_status: synced
project_status: 🟢 已上線，持續優化
next_action: (no unchecked task found)
repo_branch: main
repo_last_commit: dac9da3 2026-02-28 20:00:35 +0800 feat: Integrate LINE LIFF SDK for LINE Profile binding and auto-fill
repo_dirty_files: 6
<!-- SYNC:END -->

## 📝 Manual Notes (Do Not Auto-Overwrite)

- 2026-03-20：Passport 會員中心已從 local draft 接到 shared `profiles` 讀寫流程。
- 2026-03-20：新增 migration `supabase/migrations/20260320_add_profile_center_fields.sql`，並已透過 Supabase Management API 真正補上 `is_mbti_public / is_footprint_public / favorite_character_id / passport_title_id`。
- 2026-03-20：本機已完成沉浸式會員中心 UI、shared profile adapter、build / typecheck 驗證通過。
- 2026-03-20：已驗證雲端 `profiles` 新欄位存在，`favorite_character_id` constraint 建立成功，且 `passport_title_id='locked'` 已回填 22 筆既有資料。
- 2026-03-21：已補 Passport 會員中心 shared `profiles` debug 修補：讀寫改為 `auth id -> line_user_id` fallback，並在會員中心 UI 顯示 shared sync 狀態，方便真人測試重整後是否真的讀回。
- 2026-03-21：已補 `passport_title_id` 顯示層，不再固定硬寫 locked；目前若 shared row 值仍為 `locked`，畫面會如實顯示。
