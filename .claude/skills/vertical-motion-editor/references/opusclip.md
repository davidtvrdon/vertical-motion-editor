# OpusClip (and similar clip makers)

Optional. Everything else in the skill works on any vertical MP4. If the user's clips come from OpusClip (connector tools `mcp__OpusClip__*`),
note that OpusClip bakes its own captions, emoji, keyword highlight and a hook text box into its renders, and those would clash with ours.
So never edit the original:

1. `opusclip_list_projects` → `opusclip_list_clips` (large output: parse the saved JSON; rank by `score`, then the sum of `hook/coherence/connection/trend`).
2. `opusclip_duplicate_clip` → on the **copy** `opusclip_edit_clip` with ops `set_captions false`, `set_emoji false`, `set_keyword_highlight false`, `remove_text_overlay 0` (dry-run first to see the hook text, which is a good HookTitle candidate).
3. `opusclip_export_clip` (poll until `ready`) → download the `export_url` → `new_project.py`.
4. Run `detect_layout.py` (split-screen stretches, and `--outro-color` if the clip ends on a solid-colour end card) and then `analyze_faces.py`.
   Pick a neutral/no-logo OpusClip template, so there is nothing burned into the frame that our punch-in zooms would scale. If a template does burn
   a logo into a corner, remove it with ffmpeg `delogo` and redraw the brand logo at a fixed spot with `plan.logo` (the watermark in brand.json does this automatically).
5. OpusClip stacks two speakers and swaps who is on top as the talk moves. If the same person should always be in the upper half, set `layout.hostSwap` windows (and flip `layout.speakers` there).

## Publishing a finished render through OpusClip (Instagram / TikTok)

1. `opusclip_create_upload_link`, then a resumable upload of `out/<name>-final.mp4` (POST start, then PUT the file).
2. `opusclip_submit_project` with `videoUrl: <upload_id>`, `skipCurate: true`, `enableCaption: false`, and a **neutral template** (one without logo or outro, since ours are already in the render).
3. OpusClip may **still burn in its own captions** even with `enableCaption: false`. Run `opusclip_edit_clip` with `set_captions/set_emoji/set_keyword_highlight: false` (every op should report `changed: true`) and wait for `render_pending: false`. Then **verify what will actually be posted**: `opusclip_export_clip` (HD), download it, and look at 2–3 frames where our caption is visible. There must be exactly one caption line. Never post or schedule before that check.
4. `opusclip_create_post_task` (now) or `opusclip_schedule_publish` (UTC `publishAt`), one call per account (`opusclip_list_social_accounts`). Every call returns an approval token. Combine them into one link, `https://clip.opus.pro/agent-approvals#tok1,tok2,…`, for the user to confirm. Posting is the user's decision, never automatic.
5. Sanity-check `transcript.txt` against `opusclip_describe_clip` → `transcript` (whole sentences missing = re-run; never use `--prompt` on disfluent speech).
