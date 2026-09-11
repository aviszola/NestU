# Contributing to NestU

## 🌳 Branch Strategy
- `main` — production, **protected**, tidak bisa push langsung
- `feat/<scope>` — fitur baru (mis. `feat/analytics-rpc`)
- `fix/<scope>` — bug fix (mis. `fix/analytics-i18n`)
- `chore/<scope>` — maintenance
- `docs/<scope>` — dokumentasi

## 🔄 Workflow
1. Branch dari `main`: `git checkout -b feat/<scope>`
2. Commit met conventional commit: `feat(scope): subject`
3. Push ke branch: `git push origin feat/<scope>`
4. Buka PR → CI otomatis jalan
5. Cek **Vercel Preview URL** di komentar PR untuk QA visual
6. Merge setelah CI hijau + review approve

## ✅ Sebelum Buka PR
```bash
npx tsc --noEmit
npm run lint
npm run build
```

## ⚠️ Jangan Commit
- `.env*` (kecuali `.env.example`)
- `scratch/`
- `*.log`
- `node_modules/`
- File debug pribadi

## 📝 Commit Convention
- `feat(scope): fitur baru`
- `fix(scope): bug fix`
- `chore(scope): maintenance`
- `docs(scope): dokumentasi`
- `refactor(scope): refactor`
- `style(scope): formatting`