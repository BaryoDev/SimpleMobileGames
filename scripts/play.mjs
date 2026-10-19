import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = 'com.baryodev.birdflight';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;
const AAB = join(ROOT, 'android/app/build/outputs/bundle/release/app-release.aab');
const LANG = 'en-US';
const TRACK = 'alpha';

let token;
function getToken() {
  if (!token) {
    token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  }
  return token;
}

function scrub(text) {
  return token ? String(text).split(token).join('[token]') : String(text);
}

async function call(method, url, { json, body, contentType } = {}) {
  const headers = {
    authorization: `Bearer ${getToken()}`,
    'x-goog-user-project': 'baryodev-play',
  };
  let payload = body;
  if (json !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(json);
  } else if (contentType) {
    headers['content-type'] = contentType;
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url.replace(API, '').replace(UPLOAD, '')} failed: ${res.status} ${scrub(text)}`);
  }
  return text ? JSON.parse(text) : {};
}

const openEdit = () => call('POST', `${API}/edits`, { json: {} });
const dropEdit = (id) => call('DELETE', `${API}/edits/${id}`);

async function status() {
  const edit = await openEdit();
  try {
    const base = `${API}/edits/${edit.id}`;
    const tracks = await call('GET', `${base}/tracks`);
    for (const t of tracks.tracks ?? []) {
      console.log(`track ${t.track}`);
      for (const r of t.releases ?? []) {
        console.log(`  release ${r.name ?? '(unnamed)'} status=${r.status} versionCodes=${(r.versionCodes ?? []).join(',')}`);
      }
    }
    const bundles = await call('GET', `${base}/bundles`).catch((e) => ({ error: e.message }));
    console.log(`bundles: ${bundles.error ?? (bundles.bundles ?? []).map((b) => b.versionCode).join(',')}`);
    const listings = await call('GET', `${base}/listings`);
    for (const l of listings.listings ?? []) {
      console.log(`listing ${l.language}`);
      console.log(`  title: ${l.title}`);
      console.log(`  short: ${l.shortDescription}`);
      console.log('  full:');
      console.log(String(l.fullDescription ?? '').split('\n').map((x) => `    ${x}`).join('\n'));
    }
    for (const t of (tracks.tracks ?? []).map((x) => x.track)) {
      const testers = await call('GET', `${base}/testers/${t}`).catch(() => null);
      if (testers && (testers.googleGroups?.length || testers.autoEnrolledGoogleGroups?.length)) {
        console.log(`testers ${t}: ${JSON.stringify(testers)}`);
      }
    }
    const alpha = await call('GET', `${base}/testers/${TRACK}`).catch(() => ({}));
    console.log(`testers ${TRACK}: ${JSON.stringify(alpha)}`);
  } finally {
    await dropEdit(edit.id);
  }
}

async function release({ dryRun }) {
  const group = process.env.BF_TESTERS_GROUP;
  if (!group) throw new Error('set BF_TESTERS_GROUP to the testers Google group address');
  if (!existsSync(AAB)) throw new Error(`missing bundle at ${AAB}, run npm run bundle`);
  const notes = readFileSync(join(ROOT, 'store/release-notes.txt'), 'utf8').trim();
  const listing = JSON.parse(readFileSync(join(ROOT, 'store/listing.json'), 'utf8'));
  const shotsDir = join(ROOT, 'store/screenshots');
  const shots = readdirSync(shotsDir).filter((f) => f.endsWith('.png')).sort();
  if (!shots.length) throw new Error('no screenshots in store/screenshots');

  const edit = await openEdit();
  const base = `${API}/edits/${edit.id}`;
  let committed = false;
  try {
    const bundle = await call('POST', `${UPLOAD}/edits/${edit.id}/bundles?uploadType=media`, {
      body: readFileSync(AAB),
      contentType: 'application/octet-stream',
    });
    console.log(`uploaded bundle versionCode=${bundle.versionCode}`);

    await call('PUT', `${base}/tracks/${TRACK}`, {
      json: {
        track: TRACK,
        releases: [{
          name: '2.0.0',
          versionCodes: [String(bundle.versionCode)],
          status: 'completed',
          releaseNotes: [{ language: LANG, text: notes }],
        }],
      },
    });
    console.log(`set ${TRACK} track`);

    await call('PATCH', `${base}/listings/${LANG}`, {
      json: {
        title: listing.title,
        shortDescription: listing.shortDescription,
        fullDescription: listing.fullDescription,
      },
    });
    console.log('patched listing');

    await call('DELETE', `${base}/listings/${LANG}/phoneScreenshots`);
    for (const f of shots) {
      await call('POST', `${UPLOAD}/edits/${edit.id}/listings/${LANG}/phoneScreenshots?uploadType=media`, {
        body: readFileSync(join(shotsDir, f)),
        contentType: 'image/png',
      });
    }
    console.log(`uploaded ${shots.length} screenshots`);

    await call('PUT', `${base}/testers/${TRACK}`, { json: { googleGroups: [group] } });
    console.log(`set ${TRACK} testers`);

    await call('POST', `${base}:validate`);
    console.log('validate ok');

    if (dryRun) {
      await dropEdit(edit.id);
      committed = true;
      console.log('dry run, edit deleted');
      return;
    }
    await call('POST', `${base}:commit`);
    committed = true;
    console.log('commit ok');
  } catch (e) {
    if (!committed) await dropEdit(edit.id).catch(() => {});
    throw e;
  }
}

const [cmd, ...flags] = process.argv.slice(2);
try {
  if (cmd === 'status') await status();
  else if (cmd === 'release') await release({ dryRun: flags.includes('--dry-run') });
  else {
    console.error('usage: node scripts/play.mjs status | release [--dry-run]');
    process.exitCode = 2;
  }
} catch (e) {
  console.error(scrub(e.message));
  process.exitCode = 1;
}
