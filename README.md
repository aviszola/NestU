This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Testing accounts & cleanup (NestU)

All automated/e2e test scripts create accounts on the **`@sle.test`** domain:

- **Canonical/persistent** (`test_*`): `test_admin@sle.test`, `test_pemilik@sle.test`,
  `test_siswa@sle.test`, `test_siswa_2@sle.test`, `test_pemilik_2@sle.test`.
  These are the stable "login as role X" drivers and are **kept**.
- **Ephemeral/per-run** (`qa_*<suffix>@sle.test`, e.g. `qa_siswa_a_<ts>`, `qa_pemilik_<ts>`,
  `qa_rls_a_<ts>`, `qa_bug001_b_<ts>`, `qa_*_room_<ts>`, `qa_*_rot_<ts>`): created each run
  with a `Date.now().toString(36)` suffix and must be removed at the end of the run.

> ⚠️ **Rule:** every test script that `auth.signUp`s an account MUST delete/clean up the
> accounts and related rows (kos/rooms/bookings/logs) it created **at the end** (post-verification),
> so they don't accumulate. See `scratch/qa/cleanup_final.mjs` for the data-cleanup pattern.

**Auditing leftover test accounts:** run the read-only report
`node scratch/qa/audit_test_accounts.mjs` — it logs in as `test_admin` and prints every
`@sle.test` account with role, `created_at`, and related kos/bookings counts. It never
modifies data.

**Removing leftover auth accounts:** the public anon/admin client **cannot** delete
`auth.users` (no service-role key in the repo). Deletion must be done either with a
`SUPABASE_SERVICE_KEY` (`auth.admin.deleteUser`) or manually in **Supabase Dashboard →
Authentication → Users**.
