import { useMemo, useState, useEffect, useId, useRef } from 'react';
import cc from '../../results/calling_codes.json';
import ex from '../../results/example_lookups.json';
import mainPy from '../../main.py?raw';
import { inspect } from './lookup.js';

const REPO = 'https://github.com/JesunAhmadUshno/Track-Location-Using-Phone-Number';
const blob = (p) => `${REPO}/blob/main/${p}`;
const S = cc.summary;
const VER = cc.phonenumbers_version;
const pct = (a, b) => `${Math.round((a / b) * 100)}%`;
const SRC = mainPy.replace(/\r/g, '').split('\n');

const SECTIONS = [['top', 'Overview', '◎'], ['pipeline', 'Pipeline', '⇢'], ['inspect', 'Inspect', '⌕'], ['recorded', 'Recorded', '▤'], ['precision', 'Precision', '◬'], ['issues', 'Issues', '!']];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">Phone Number Lookup</a>
      <a className="m" href={blob('main.py')}>main.py</a>
      <a className="m" href={blob('scripts/export_metadata.py')}>Export script</a>
      <a className="m" href={blob('docs/research-review.md')}>Review</a>
      <span className="spacer" />
      <span className="status"><i /> phonenumbers {VER}</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

export default function App() {
  useReveal();
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Pipeline />
      <Inspector />
      <Recorded />
      <Precision />
      <Issues />
      <Dock />
      <footer>
        Metadata: the <a href="https://pypi.org/project/phonenumbers/">phonenumbers</a> Python library {VER} (a port of Google's libphonenumber, Apache-2.0).
        Every number on this page is read from <code>results/</code> at build time, produced by <code>scripts/export_metadata.py</code>; the inspector runs in your browser and sends nothing anywhere.
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <header className="card hero window" id="top" data-title="main.py — README">
      <div className="head">
        <p className="eyebrow">Python coursework · region-level lookup</p>
        <span className="pill warn">● Region, not device</span>
      </div>
      <h1>A phone number tells you its <em>registered region</em> and carrier, not where the phone is: a five-step Python pipeline from number to map pin.</h1>
      <p className="sub">
        The repo is named "Track Location Using Phone Number", but the code never touches a phone. It reads the number's prefix against an offline table,
        gets a place name such as "Dhaka" and the carrier the range was first allocated to, asks the OpenCage geocoder where that place name is, and drops a map pin on its centre.
        Anyone with the same number gets the same pin, wherever the phone happens to be.
      </p>
      <div className="actions">
        <a className="btn primary" href="#inspect">Try the number inspector</a>
        <a className="btn ghost" href={blob('main.py')}>Read main.py</a>
        <span className="hint">Regenerate the data with <code>python scripts/export_metadata.py</code></span>
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{S.calling_codes}</div><div className="cap">Country calling codes in phonenumbers {VER}</div></div>
        <div className="tile"><div className="num">{S.shared_codes}</div><div className="cap">Codes shared by more than one region ({S.regions_on_shared_codes} regions in all)</div></div>
        <div className="tile"><div className="num">{pct(S.rows_finer_than_country, S.example_rows)}</div><div className="cap">Example numbers that resolve to anything finer than a country</div></div>
        <div className="tile"><div className="num">0</div><div className="cap">Stages that ever see the device. The pin is a place-name centroid.</div></div>
      </div>
    </header>
  );
}

const STAGES = [
  { k: 'parse', t: 'phonenumbers.parse', d: 'Split the text into country code and national number, then check the range is allocated.', io: 'str → PhoneNumber', live: true, re: /phonenumbers\.(parse|is_valid_number|format_number|region_code_for_number|number_type)\(/ },
  { k: 'region', t: 'geocoder.description_for_number', d: 'Look the prefix up in an offline table of area codes and mobile ranges. Returns a place name, often just the country.', io: 'PhoneNumber → place name', live: true, re: /description_for_number/ },
  { k: 'carrier', t: 'carrier.name_for_number', d: 'Look up the operator the mobile range was originally allocated to. After a number is ported this is out of date.', io: 'PhoneNumber → carrier name', live: true, re: /carrier\.name_for_number/ },
  { k: 'geocode', t: 'OpenCageGeocode.geocode', d: 'Send the place name to the OpenCage API and take the first result\'s centre point.', io: 'place name → (lat, lng)', live: false, re: /OpenCageGeocode|geometry|if not results|raise LookupError/ },
  { k: 'map', t: 'folium.Map + Marker', d: 'Draw a map, drop a pin on that centre point and save mylocation.html.', io: '(lat, lng) → HTML map', live: false, re: /folium/ },
];

function Pipeline() {
  const [i, setI] = useState(0);
  const st = STAGES[i];
  const hits = SRC.map((l) => st.re.test(l));
  const pre = useRef(null);
  useEffect(() => { // scroll the code pane (not the page) to the first highlighted line
    const el = pre.current?.querySelector('.hl');
    if (el) pre.current.scrollTop = el.offsetTop - 60;
  }, [i]);
  return (
    <section id="pipeline" className="card window reveal" data-title="pipeline.py — the stages of main.py">
      <div className="head">
        <div>
          <p className="eyebrow">Pipeline stepper</p>
          <h2>Five calls, one direction: number, place name, coordinates, pin.</h2>
          <p className="sub">Pick a stage to highlight its lines in <a href={blob('main.py')}>main.py</a>, imported here verbatim at build time. The first three stages run offline; the last two need an OpenCage API key and are not run on this page.</p>
        </div>
      </div>
      <div className="grid2 pipe">
        <ol className="steps stepper">
          {STAGES.map((s, j) => (
            <li key={s.k}>
              <button type="button" className={`stage ${j === i ? 'on' : ''}`} aria-pressed={j === i} onClick={() => setI(j)}>
                <span className="n">{j + 1}</span>
                <span className="body">
                  <b className="mono">{s.t}</b>
                  <small>{s.io}</small>
                </span>
                <span className={`pill ${s.live ? 'good' : 'warn'}`}>{s.live ? 'offline' : 'needs key'}</span>
              </button>
            </li>
          ))}
        </ol>
        <div>
          <div className="tile stage-note">
            <h3>{i + 1}. {st.t}</h3>
            <p className="hint">{st.d}</p>
            <p className="hint"><b>Input → output:</b> <span className="mono">{st.io}</span> · {st.live ? 'reproduced in the inspector below' : 'needs an OpenCage API key, not run here'}</p>
          </div>
          <pre ref={pre} className="src" aria-label={`main.py with the ${st.t} lines highlighted`} tabIndex={0}>
            {SRC.map((l, n) => <span key={n} className={hits[n] ? 'hl' : ''}><i>{n + 1}</i>{l || ' '}{'\n'}</span>)}
          </pre>
        </div>
      </div>
    </section>
  );
}

const SAMPLES = (() => {
  const pick = (region, source) => ex.rows.find((r) => r.region === region && r.source === source);
  return [pick('US', 'example'), pick('GB', 'example'), pick('BD', 'mobile'), pick('IN', 'example'), pick('JM', 'example')].filter(Boolean);
})();

function Inspector() {
  const [val, setVal] = useState(SAMPLES[0]?.e164 ?? '+');
  const id = useId();
  const r = inspect(val, cc.codes);
  const known = r.regions ? ex.rows.filter((x) => r.regions.includes(x.region)) : [];
  return (
    <section id="inspect" className="card window reveal" data-title="inspect.app — live in your browser">
      <div className="head">
        <div>
          <p className="eyebrow">Live number inspector</p>
          <h2>Type a number and see exactly what its prefix gives away.</h2>
          <p className="sub">
            This reproduces stage 1 in your browser: a longest-prefix match against the {S.calling_codes} calling codes exported from phonenumbers {VER}, plus E.164 shape checks (a leading +, digits only, at most 15).
            It does not check whether the range is allocated; the Python <code>lookup()</code> does that with <code>is_valid_number</code>. Nothing you type leaves this page.
          </p>
        </div>
        <span className="pill info">computed live</span>
      </div>
      <div className="field inspect-field">
        <label htmlFor={id}>Phone number in E.164 format</label>
        <input id={id} className="num-input" type="text" inputMode="tel" autoComplete="off" spellCheck="false" value={val} onChange={(e) => setVal(e.target.value)} />
      </div>
      <div className="chips" role="group" aria-label="Library example numbers">
        <span className="hint">Library example numbers:</span>
        {SAMPLES.map((s) => <button key={s.e164} type="button" className="chip" onClick={() => setVal(s.e164)}>{s.region} {s.e164}</button>)}
      </div>
      <div className="tiles" aria-live="polite">
        <div className="tile"><div className="num">{r.cc ? `+${r.cc}` : '—'}</div><div className="cap">Country calling code</div></div>
        <div className="tile"><div className="num">{r.regions ? r.regions.length : '—'}</div><div className="cap">{r.regions ? `Possible region${r.regions.length > 1 ? 's' : ''}: ${r.regions.slice(0, 8).join(', ')}${r.regions.length > 8 ? ', …' : ''}` : 'Possible regions'}</div></div>
        <div className="tile"><div className="num mono-num">{r.nsn || '—'}</div><div className="cap">National significant number</div></div>
        <div className="tile"><div className="num">{r.digits ? r.digits.length : '—'}</div><div className="cap">Digits (E.164 maximum 15)</div></div>
      </div>
      <p className={`status-line ${r.ok ? 'ok' : 'no'}`}>
        {r.ok
          ? (r.nonGeographic ? 'Valid shape. This is a non-geographic code (for example a global service or satellite range): it has no region at all.' : `Valid shape. Stage 1 can only narrow this to ${r.regions.length > 1 ? `one of ${r.regions.length} regions sharing +${r.cc}` : `region ${r.regions[0]}`}; stage 2 would then read a place name from the next digits.`)
          : r.error}
      </p>
      {known.length > 0 && (
        <div className="known">
          <h3>What the offline tables recorded for {r.regions.length > 1 ? 'these regions' : 'this region'} (recorded, library example numbers)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Region</th><th>Example number</th><th>Place name (stage 2)</th><th>Carrier (stage 3)</th></tr></thead>
              <tbody>{known.slice(0, 6).map((x) => <tr key={x.e164}><td>{x.region}</td><td className="mono">{x.e164}</td><td>{x.description || <span className="no">none</span>}</td><td>{x.carrier || <span className="no">none</span>}</td></tr>)}</tbody>
            </table>
          </div>
          {known.length > 6 && <p className="hint">Showing 6 of {known.length} recorded rows; see the full table below.</p>}
        </div>
      )}
      <div className="grid2 not-run">
        <div className="tile"><div className="head" style={{ marginBottom: 4 }}><h3>Stage 4: OpenCage geocode</h3><span className="pill warn">not run here</span></div><p className="hint">Needs a personal API key, so it runs only on your machine. Its output is the centre of a place name, so it adds no information about the phone.</p></div>
        <div className="tile"><div className="head" style={{ marginBottom: 4 }}><h3>Stage 5: folium map</h3><span className="pill warn">not run here</span></div><p className="hint">Draws that centre point. No pin is shown on this page because none was computed, and faking one would imply precision that does not exist.</p></div>
      </div>
    </section>
  );
}

function Recorded() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('region');
  const [all, setAll] = useState(false);
  const qid = useId(), sid = useId();
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = ex.rows.filter((x) => (kind === 'all' || x.source === kind) && (!t || [x.region, x.e164, x.description, x.carrier, x.type].join(' ').toLowerCase().includes(t)));
    const key = { region: (x) => x.region, carrier: (x) => x.carrier || '~', description: (x) => x.description || '~', type: (x) => x.type }[sort];
    return [...r].sort((a, b) => key(a).localeCompare(key(b)));
  }, [q, kind, sort]);
  const shown = all ? rows : rows.slice(0, 12);
  return (
    <section id="recorded" className="card window reveal" data-title="example_lookups.json — recorded">
      <div className="head">
        <div>
          <p className="eyebrow">Recorded lookups</p>
          <h2>Stages 1 to 3 on {ex.rows.length} library example numbers, one per type per region.</h2>
          <p className="sub">
            Recorded offline with phonenumbers {ex.phonenumbers_version} by <a href={blob('scripts/export_metadata.py')}>export_metadata.py</a>, which calls the same <code>lookup()</code> as main.py on <code>phonenumbers.example_number</code> values.
            These are the library's own sample numbers, not real people's. This is a replay of that run, not a live call.
          </p>
        </div>
        <span className="pill warn">recorded</span>
      </div>
      <div className="controls rec-controls">
        <div className="field"><label htmlFor={qid}>Filter</label><input id={qid} type="search" className="text-input" placeholder="region, place, carrier…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="field"><label htmlFor={sid}>Sort by</label>
          <select id={sid} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="region">Region</option><option value="description">Place name</option><option value="carrier">Carrier</option><option value="type">Number type</option>
          </select>
        </div>
        <div className="field"><span className="lab-text">Example kind</span>
          <div className="seg" role="group" aria-label="Example kind">
            {[['all', 'All'], ['example', 'Default'], ['mobile', 'Mobile']].map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Region</th><th>Example number</th><th>Type</th><th>Place name</th><th>Carrier</th></tr></thead>
          <tbody>{shown.map((x) => <tr key={x.e164}><td>{x.region}</td><td className="mono">{x.e164}</td><td className="mono">{x.type}</td><td>{x.description || <span className="no">none</span>}</td><td>{x.carrier || <span className="no">none</span>}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <span className="hint">{rows.length} of {ex.rows.length} rows match.</span>
        {rows.length > 12 && <button type="button" className="btn ghost" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
      </div>
    </section>
  );
}

function Precision() {
  const rungs = [
    { k: 'Country calling code', v: S.calling_codes - S.shared_codes - S.non_geographic_codes, of: S.calling_codes, note: `codes name exactly one region; ${S.shared_codes} are shared (+${S.largest_shared_code} covers ${cc.codes[S.largest_shared_code].length} regions) and ${S.non_geographic_codes} have no region` },
    { k: 'Place name finer than country', v: S.rows_finer_than_country, of: S.example_rows, note: 'example numbers get a city or area; the rest get only the country name or nothing' },
    { k: 'Any place name at all', v: S.rows_with_description, of: S.example_rows, note: 'example numbers get some description from the offline geocoder' },
    { k: 'Original carrier (mobile)', v: S.mobile_rows_with_carrier, of: S.mobile_rows, note: 'mobile examples have a carrier name; porting can make it wrong' },
    { k: 'Device location', v: 0, of: 1, note: 'no stage reads GPS, cell towers or network data' },
  ];
  const W = 960, rowH = 58, l = 260, r = 70, H = rungs.length * rowH + 10;
  const x = (f) => l + f * (W - l - r);
  const shared = Object.entries(cc.codes).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
  const W2 = 960, H2 = 200, bw = (W2 - 60) / shared.length, maxN = shared[0][1].length;
  return (
    <section id="precision" className="card window reveal" data-title="precision.svg — what each stage can resolve">
      <p className="eyebrow">Resolution ladder</p>
      <h2>Each stage resolves less than its name suggests, and none reaches the phone.</h2>
      <p className="sub">Shares are computed at build time from <a href={blob('results/calling_codes.json')}>calling_codes.json</a> and <a href={blob('results/example_lookups.json')}>example_lookups.json</a>. Example numbers are the library's samples, one or two per region, so these are coverage figures for the metadata, not accuracy on real traffic.</p>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Share of numbers each pipeline stage can resolve, from country code down to device location">
        {rungs.map((g, i) => {
          const f = g.v / g.of, y = i * rowH + 18;
          return (
            <g key={g.k} transform={`translate(0 ${y})`}>
              <text x={0} y={6} style={{ fill: 'var(--text)', fontSize: 14, fontWeight: 600 }}>{g.k}</text>
              <text x={0} y={26} style={{ fontSize: 12 }}>{g.of > 1 ? `${g.v} of ${g.of}` : 'never'}</text>
              <rect x={l} y={-8} width={W - l - r} height={22} rx={6} fill="var(--grid)" />
              <rect x={l} y={-8} width={Math.max(0, x(f) - l)} height={22} rx={6} fill={i === rungs.length - 1 ? 'var(--bad)' : 'var(--primary)'} opacity={1 - i * 0.12} />
              <text x={W - r + 10} y={8} style={{ fill: 'var(--text)', fontSize: 14, fontWeight: 600 }}>{Math.round(f * 100)}%</text>
            </g>
          );
        })}
      </svg>
      <ul className="ladder-notes">
        {rungs.map((g) => <li key={g.k}><b>{g.k}:</b> {g.of > 1 ? `${g.v} of ${g.of} ` : ''}{g.note}.</li>)}
      </ul>
      <h3 style={{ marginTop: 20 }}>The {S.shared_codes} shared calling codes: stage 1 cannot even pick the country</h3>
      <svg className="chart" viewBox={`0 0 ${W2} ${H2}`} role="img" aria-label={`Number of regions sharing each of the ${S.shared_codes} shared calling codes`}>
        {shared.map(([code, regs], i) => {
          const h = (regs.length / maxN) * (H2 - 50);
          return (
            <g key={code}>
              <rect x={40 + i * bw + 6} y={H2 - 24 - h} width={bw - 12} height={h} rx={5} fill="var(--warn)" opacity="0.85"><title>+{code}: {regs.join(', ')}</title></rect>
              <text x={40 + i * bw + bw / 2} y={H2 - 28 - h} textAnchor="middle" style={{ fill: 'var(--text)' }}>{regs.length}</text>
              <text x={40 + i * bw + bw / 2} y={H2 - 8} textAnchor="middle">+{code}</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

const ISSUES = [
  { s: 'fixed', t: 'folium used but never imported', d: 'The original main.py raised NameError at the map step, so it never produced a map. folium is now imported inside save_map().' },
  { s: 'owner', t: 'OpenCage API key hard-coded', d: 'The key was committed in main.py. It now comes from OPENCAGE_API_KEY, but it remains in git history, so the only real fix is to revoke it on opencagedata.com. The build fails if it ever reaches this site.' },
  { s: 'fixed', t: 'A personal phone number committed', d: 'myphone.py held what looks like a real number. It now holds the library\'s example number; the old value stays in history and is never shown or exported here.' },
  { s: 'fixed', t: 'No input validation or error handling', d: 'lookup() now calls is_valid_number, and an empty geocode result raises a clear LookupError instead of an IndexError on results[0].' },
  { s: 'fixed', t: 'No tests, no pinned dependencies', d: 'test_lookup.py covers stages 1 to 3 offline with library example numbers; requirements.txt pins phonenumbers, opencage and folium.' },
  { s: 'open', t: 'No accuracy evaluation', d: 'Nothing measures how far the geocoded centroid is from where numbers are really used. That needs a labelled set of numbers with known locations, which raises its own privacy questions.' },
  { s: 'open', t: 'Porting, VoIP and roaming ignored', d: 'Carrier data reflects the original allocation, VoIP and non-geographic numbers carry no place, and a phone abroad still maps home.' },
  { s: 'open', t: 'Misleading name', d: 'The repo name says "track location". The README now says plainly that this is region-level lookup; renaming the repo is the owner\'s call.' },
];

function Issues() {
  const label = { fixed: ['good', 'Fixed on this branch'], owner: ['bad', 'Owner action needed'], open: ['warn', 'Open'] };
  return (
    <section id="issues" className="card window reveal" data-title="issues.log — review findings and limits">
      <p className="eyebrow">Known issues, limitations and ethics</p>
      <h2>What the code review found, and what this project can never do.</h2>
      <div className="grid2" style={{ marginTop: 16 }}>
        {ISSUES.map((c) => (
          <div className="tile" key={c.t}>
            <div className="head" style={{ marginBottom: 6 }}><h3>{c.t}</h3><span className={`pill ${label[c.s][0]}`}>{label[c.s][1]}</span></div>
            <p className="hint" style={{ margin: 0, fontSize: 13 }}>{c.d}</p>
          </div>
        ))}
      </div>
      <div className="tile privacy">
        <h3>Privacy note</h3>
        <p className="hint" style={{ margin: 0, fontSize: 13 }}>
          Looking up someone's number with this code tells you roughly what anyone could read from the dialling code. It cannot locate a person, and it should not be presented as if it could.
          Real device location needs the network operator or the device itself, and is protected by law in most countries. The full grading is in <a href={blob('docs/research-review.md')}>docs/research-review.md</a>.
        </p>
      </div>
    </section>
  );
}
