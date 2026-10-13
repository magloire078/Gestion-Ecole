'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const SESSION_KEY = 'gereecole-intro-shown';

const BG_IMAGES = [
  '/custom-assets/intro-spot/bg-1.jpg',
  '/custom-assets/intro-spot/bg-2.jpg',
  '/custom-assets/intro-spot/bg-3.jpg',
];

// Durées du montage "intro" (variante courte du spot, ~30s), en ms.
const DURATIONS = [4000, 6500, 6000, 5500, 4000, 4000];
const TOTAL_MS = DURATIONS.reduce((a, b) => a + b, 0);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function Counter({ target, active, suffix }: { target: number; active: boolean; suffix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    let raf = 0;
    let t0 = 0;
    const dur = 1400;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return <>{value.toLocaleString('fr-FR')}{suffix}</>;
}

export function IntroSpot() {
  const [shouldRender, setShouldRender] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [closing, setClosing] = useState(false);
  const [vertical, setVertical] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
    setClosing(true);
    setTimeout(() => setShouldRender(false), 500);
  };

  // Décide, avant peinture, si l'intro doit s'afficher (évite un flash du site).
  useIsomorphicLayoutEffect(() => {
    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SESSION_KEY) === '1'; } catch { /* ignore */ }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (alreadySeen || reducedMotion) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
    setShouldRender(true);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    const mq = window.matchMedia('(orientation: portrait)');
    const apply = () => setVertical(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || closing) return;
    if (sceneIndex >= DURATIONS.length - 1) {
      timerRef.current = setTimeout(close, DURATIONS[DURATIONS.length - 1]);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    timerRef.current = setTimeout(() => setSceneIndex((i) => i + 1), DURATIONS[sceneIndex]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender, sceneIndex, closing]);

  if (!shouldRender) return null;

  const progressPct = (() => {
    const elapsedBefore = DURATIONS.slice(0, sceneIndex).reduce((a, b) => a + b, 0);
    return Math.min(100, (elapsedBefore / TOTAL_MS) * 100 + (100 / DURATIONS.length) * 0.15);
  })();

  return (
    <div className={`introspot-root${closing ? ' closing' : ''}`}>
      <div className={`introspot-stage${vertical ? ' vertical' : ''}`}>
        <div className="bg">
          {BG_IMAGES.map((src, k) => (
            <div key={src} className={`bg-img${sceneIndex % BG_IMAGES.length === k ? ' on' : ''}`} style={{ backgroundImage: `url(${src})` }} />
          ))}
          <div className="bg-shade" />
        </div>
        <div className="glow a" />
        <div className="glow b" />

        {/* Scène 0 — accroche */}
        <section className={`scene${sceneIndex === 0 ? ' active' : ''}`}>
          <div className="stagger">
            <div className="brand"><span className="mark">G</span><span className="word">Gère<b>Ecole</b></span></div>
            <h2 className="title">Toute votre école,<br /><span className="accent">dans une seule plateforme.</span></h2>
            <p className="sub">Inscriptions, notes, scolarité, paie, communication — en ligne et en temps réel.</p>
          </div>
        </section>

        {/* Scène 1 — tableau de bord */}
        <section className={`scene${sceneIndex === 1 ? ' active' : ''}`}>
          <div className="stagger"><span className="eyebrow">Tableau de bord</span><h2 className="title t5">Votre école, d&apos;un coup d&apos;œil.</h2></div>
          <div className="dash">
            <div className="cards">
              <div className="card hl"><div className="k">Élèves inscrits</div><div className="v"><Counter target={512} active={sceneIndex === 1} /></div></div>
              <div className="card mt"><div className="k">Recouvrement</div><div className="v"><Counter target={87} active={sceneIndex === 1} /><small>%</small></div></div>
              <div className="card gd" style={{ gridColumn: 'span 2' }}><div className="k">Revenus du mois</div><div className="v"><Counter target={4250000} active={sceneIndex === 1} /><small>FCFA</small></div></div>
            </div>
            <div className="chart">
              <div className="k">Recouvrement · 6 mois</div>
              <div className="bars">
                {[48, 62, 55, 74, 83, 92].map((h, k) => (
                  <div key={k} className="bar" style={{ ['--h' as string]: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Scène 2 — paiement mobile money */}
        <section className={`scene${sceneIndex === 2 ? ' active' : ''}`}>
          <div className="split">
            <div className="stagger">
              <span className="eyebrow">Paiement · GeniusPay</span>
              <h2 className="title t54">La scolarité se paie<br />en <span className="accent">un clic.</span></h2>
              <p className="sub">Mobile money et carte bancaire, depuis le téléphone du parent. Encaissement suivi en temps réel.</p>
            </div>
            <div className="phone">
              <div className="notch" />
              <div className="ph-row"><span className="ph-ic" style={{ background: 'rgba(45,156,219,0.2)' }}>🎓</span><span className="ph-tx">Scolarité · 2ᵉ tranche<small>Koffi Amenan — CM2</small></span></div>
              <div className="ph-row"><span className="ph-ic" style={{ background: 'rgba(245,165,36,0.2)' }}>📱</span><span className="ph-tx">Mobile money<small>Paiement sécurisé</small></span><span className="ph-amt">150 000</span></div>
              <div className="pay-btn">Payer 150 000 FCFA</div>
              <div className="pay-ok"><div className="check">✓</div><div className="msg">Paiement confirmé</div></div>
            </div>
          </div>
        </section>

        {/* Scène 3 — portail parent */}
        <section className={`scene${sceneIndex === 3 ? ' active' : ''}`}>
          <div className="split">
            <div className="phone">
              <div className="notch" />
              <div className="ph-row"><span className="ph-ic" style={{ background: 'rgba(45,156,219,0.2)' }}>📝</span><span className="ph-tx">Nouvelle note · Maths<small>16/20 — Devoir surveillé</small></span></div>
              <div className="ph-row"><span className="ph-ic" style={{ background: 'rgba(229,72,77,0.2)' }}>📅</span><span className="ph-tx">Absence justifiée<small>Vendredi — 1 séance</small></span></div>
              <div className="ph-row"><span className="ph-ic" style={{ background: 'rgba(39,192,147,0.2)' }}>✅</span><span className="ph-tx">Scolarité à jour<small>Reçu disponible</small></span></div>
            </div>
            <div className="stagger">
              <span className="eyebrow">Portail parent</span>
              <h2 className="title t54">Les parents<br />suivent <span className="accent">tout.</span></h2>
              <p className="sub">Notes, absences, paiements et communication de l&apos;école — sur leur téléphone.</p>
            </div>
          </div>
        </section>

        {/* Scène 4 — résultats */}
        <section className={`scene${sceneIndex === 4 ? ' active' : ''}`}>
          <div className="stagger"><span className="eyebrow">Ce que ça change</span><h2 className="title t46">Des résultats concrets, dès le premier trimestre.</h2></div>
          <div className="stats3">
            <div className="stat"><div className="big">−40<small style={{ fontSize: '4cqw' }}>%</small></div><div className="lab">de temps administratif</div></div>
            <div className="stat"><div className="big">100<small style={{ fontSize: '4cqw' }}>%</small></div><div className="lab">en ligne, accessible partout</div></div>
            <div className="stat"><div className="big">24/7</div><div className="lab">accès pour les parents</div></div>
          </div>
        </section>

        {/* Scène 5 — CTA */}
        <section className={`scene cta-scene${sceneIndex === 5 ? ' active' : ''}`}>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="brand"><span className="mark">G</span><span className="word">Gère<b>Ecole</b></span></div>
            <h2 className="title t54">Prêt à moderniser<br />votre établissement ?</h2>
          </div>
        </section>

        <div className="progress"><div className="fill" style={{ width: `${progressPct}%` }} /></div>
        <button type="button" className="skip" onClick={close}>Passer l&apos;intro →</button>
      </div>

      <style jsx>{`
        .introspot-root {
          position: fixed; inset: 0; z-index: 200;
          background: #061626;
          opacity: 1; transition: opacity 0.5s ease;
        }
        .introspot-root.closing { opacity: 0; pointer-events: none; }

        .introspot-stage {
          position: absolute; inset: 0; width: 100vw; height: 100dvh; overflow: hidden;
          background: radial-gradient(120% 120% at 15% 0%, #0c365a 0%, #0a2135 45%, #061626 100%);
          container-type: size; color: #fff; isolation: isolate;
        }

        .bg { position: absolute; inset: 0; z-index: 0; }
        .bg-img { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transform: scale(1.05); transition: opacity 1.1s ease; will-change: opacity, transform; }
        .bg-img.on { opacity: 1; animation: introspot-kenburns 14s ease-out forwards; }
        @keyframes introspot-kenburns { from { transform: scale(1.05); } to { transform: scale(1.16); } }
        .bg-shade { position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(6,22,38,0.40), rgba(6,22,38,0.58)),
            radial-gradient(130% 120% at 50% 36%, rgba(6,22,38,0.02), rgba(6,22,38,0.62)); }

        .glow { position: absolute; border-radius: 50%; filter: blur(40px); pointer-events: none; z-index: 0; opacity: 0.5; mix-blend-mode: screen; }
        .glow.a { width: 55cqw; height: 55cqw; left: -10cqw; top: -18cqw; background: radial-gradient(circle, rgba(45,156,219,0.5), transparent 65%); animation: introspot-drift1 18s ease-in-out infinite; }
        .glow.b { width: 45cqw; height: 45cqw; right: -8cqw; bottom: -15cqw; background: radial-gradient(circle, rgba(245,165,36,0.25), transparent 65%); animation: introspot-drift2 22s ease-in-out infinite; }
        @keyframes introspot-drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(6cqw,5cqw)} }
        @keyframes introspot-drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-5cqw,-4cqw)} }

        .scene {
          position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center;
          padding: 7cqw 8cqw; opacity: 0; visibility: hidden; transform: translateY(1.4cqh) scale(0.995);
          transition: opacity 0.7s ease, transform 0.7s ease, visibility 0s linear 0.7s;
        }
        .scene.active { opacity: 1; visibility: visible; transform: none; transition: opacity 0.7s ease, transform 0.7s ease, visibility 0s; }

        .eyebrow { font-size: 2cqw; letter-spacing: 0.34em; text-transform: uppercase; font-weight: 700; color: #63c0ef; display: inline-flex; align-items: center; gap: 1.4cqw; }
        .eyebrow::before { content: ""; width: 3.4cqw; height: 2px; background: #2d9cdb; display: inline-block; }
        .title { font-size: 6.4cqw; line-height: 1.02; font-weight: 800; letter-spacing: -0.02em; text-wrap: balance; margin: 2.6cqh 0 0; text-shadow: 0 2px 24px rgba(0,0,0,0.5); }
        .title.t5 { font-size: 5cqw; } .title.t54 { font-size: 5.4cqw; } .title.t46 { font-size: 4.6cqw; }
        .title :global(.accent) { color: #63c0ef; }
        .sub { font-size: 2.5cqw; line-height: 1.4; color: rgba(234,244,251,0.82); font-weight: 400; max-width: 62cqw; margin-top: 2.4cqh; text-shadow: 0 1px 14px rgba(0,0,0,0.45); }

        .brand { display: inline-flex; align-items: center; gap: 1.8cqw; }
        .brand .mark { width: 7cqw; height: 7cqw; border-radius: 1.7cqw; flex: none; background: linear-gradient(150deg, #2d9cdb, #0c365a); box-shadow: 0 0 0 1px rgba(255,255,255,0.14) inset, 0 1cqw 3cqw -0.6cqw rgba(45,156,219,0.55); display: grid; place-items: center; font-weight: 800; font-size: 4cqw; color: #fff; }
        .brand .word { font-size: 4.6cqw; font-weight: 800; letter-spacing: -0.02em; }
        .brand .word :global(b) { color: #63c0ef; }

        .scene.active .stagger > :global(*) { animation: introspot-rise 0.7s both; }
        .scene.active .stagger > :global(*:nth-child(1)) { animation-delay: .05s; } .scene.active .stagger > :global(*:nth-child(2)) { animation-delay: .18s; }
        .scene.active .stagger > :global(*:nth-child(3)) { animation-delay: .31s; } .scene.active .stagger > :global(*:nth-child(4)) { animation-delay: .44s; }
        @keyframes introspot-rise { from{opacity:0;transform:translateY(1.8cqh)} to{opacity:1;transform:none} }

        .dash { display: grid; grid-template-columns: 1.15fr 1fr; gap: 3cqw; margin-top: 3cqh; align-items: stretch; }
        .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 2cqw; }
        .card { background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.13); border-radius: 1.6cqw; padding: 2.4cqw; backdrop-filter: blur(6px); }
        .card .k { font-size: 1.7cqw; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(234,244,251,0.62); font-weight: 700; }
        .card .v { font-size: 4.4cqw; font-weight: 800; margin-top: 0.8cqh; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .card .v :global(small) { font-size: 2cqw; font-weight: 700; color: rgba(234,244,251,0.6); margin-left: 0.5cqw; }
        .card.hl .v { color: #63c0ef; } .card.gd .v { color: #f5a524; } .card.mt .v { color: #27c093; }
        .chart { background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.13); border-radius: 1.6cqw; padding: 2.4cqw; display: flex; flex-direction: column; }
        .chart .k { font-size: 1.7cqw; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(234,244,251,0.62); font-weight: 700; }
        .bars { flex: 1; display: flex; align-items: flex-end; gap: 1.6cqw; margin-top: 2cqh; min-height: 12cqh; }
        .bar { flex: 1; border-radius: 0.8cqw 0.8cqw 0 0; background: linear-gradient(to top, #2d9cdb, #63c0ef); height: 8%; transition: height 1s cubic-bezier(.2,.7,.2,1); }
        .scene.active .bar { height: var(--h); }

        .split { display: grid; grid-template-columns: 1fr 1fr; gap: 5cqw; align-items: center; margin-top: 2cqh; }
        .phone { width: 26cqw; aspect-ratio: 9/18; margin: 0 auto; border-radius: 4cqw; background: linear-gradient(160deg, #10273c, #0a1c2c); border: 0.5cqw solid rgba(255,255,255,0.1); box-shadow: 0 3cqw 6cqw -1cqw rgba(0,0,0,0.5), 0 0 0 0.2cqw rgba(255,255,255,0.05) inset; padding: 2.2cqw; position: relative; overflow: hidden; }
        .notch { width: 30%; height: 1.2cqw; background: rgba(255,255,255,0.15); border-radius: 1cqw; margin: 0.4cqw auto 2cqw; }
        .ph-row { display: flex; align-items: center; gap: 1.4cqw; background: rgba(255,255,255,0.05); border-radius: 1.6cqw; padding: 1.5cqw; margin-bottom: 1.4cqw; }
        .ph-ic { width: 4.4cqw; height: 4.4cqw; border-radius: 1.2cqw; flex: none; display: grid; place-items: center; font-size: 2.2cqw; }
        .ph-tx { font-size: 1.9cqw; font-weight: 600; line-height: 1.25; }
        .ph-tx :global(small) { display: block; font-size: 1.5cqw; color: rgba(234,244,251,0.58); font-weight: 500; }
        .ph-amt { margin-left: auto; font-size: 2.1cqw; font-weight: 800; font-variant-numeric: tabular-nums; }
        .pay-btn { margin-top: 1cqw; background: linear-gradient(120deg, #2d9cdb, #0c365a); border-radius: 1.6cqw; padding: 1.8cqw; text-align: center; font-weight: 800; font-size: 2.1cqw; box-shadow: 0 1.2cqw 3cqw -0.8cqw rgba(45,156,219,0.7); }
        .pay-ok { position: absolute; inset: 0; background: linear-gradient(160deg, #0c2f22, #0a1c2c); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqw; opacity: 0; }
        .scene.active .pay-ok { animation: introspot-payok 3.2s 1.2s forwards; }
        @keyframes introspot-payok { 0%{opacity:0;transform:scale(1.06)} 12%,88%{opacity:1;transform:none} 100%{opacity:1} }
        .check { width: 11cqw; height: 11cqw; border-radius: 50%; background: #27c093; display: grid; place-items: center; color: #06231a; font-size: 6cqw; font-weight: 900; box-shadow: 0 0 0 1cqw rgba(39,192,147,0.18); }
        .pay-ok .msg { font-size: 2.6cqw; font-weight: 800; color: #27c093; }

        .stats3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4cqw; margin-top: 3cqh; text-align: center; }
        .stat .big { font-size: 8.5cqw; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
        .stat:nth-child(1) .big { color: #63c0ef; } .stat:nth-child(2) .big { color: #f5a524; } .stat:nth-child(3) .big { color: #27c093; }
        .stat .lab { font-size: 1.9cqw; color: rgba(234,244,251,0.75); margin-top: 1.4cqh; font-weight: 600; line-height: 1.3; }

        .cta-scene { align-items: center; text-align: center; }

        .progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,0.12); z-index: 10; }
        .progress .fill { height: 100%; background: linear-gradient(90deg, #2d9cdb, #63c0ef); transition: width 0.3s linear; }
        .skip {
          position: absolute; top: max(18px, env(safe-area-inset-top)); right: max(18px, env(safe-area-inset-right));
          z-index: 10; font: inherit; font-weight: 700; font-size: 13px; cursor: pointer;
          background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.25);
          border-radius: 100px; padding: 9px 16px; backdrop-filter: blur(6px);
        }
        .skip:hover { background: rgba(255,255,255,0.18); }
        .skip:focus-visible { outline: 2px solid #63c0ef; outline-offset: 2px; }

        /* ---------- overrides format vertical (portrait) ---------- */
        .introspot-stage.vertical .scene { padding: 11cqw 8cqw; }
        .introspot-stage.vertical .title { font-size: 9.5cqw; } .introspot-stage.vertical .title.t5 { font-size: 8cqw; } .introspot-stage.vertical .title.t54 { font-size: 8.4cqw; } .introspot-stage.vertical .title.t46 { font-size: 7.4cqw; }
        .introspot-stage.vertical .sub { font-size: 3.7cqw; max-width: none; }
        .introspot-stage.vertical .eyebrow { font-size: 3cqw; }
        .introspot-stage.vertical .brand .mark { width: 12cqw; height: 12cqw; font-size: 7cqw; border-radius: 3cqw; } .introspot-stage.vertical .brand .word { font-size: 8cqw; }
        .introspot-stage.vertical .split { grid-template-columns: 1fr; gap: 4cqh; } .introspot-stage.vertical .dash { grid-template-columns: 1fr; gap: 3cqh; }
        .introspot-stage.vertical .cards { grid-template-columns: 1fr 1fr; } .introspot-stage.vertical .card .k { font-size: 2.8cqw; } .introspot-stage.vertical .card .v { font-size: 7cqw; } .introspot-stage.vertical .card .v :global(small) { font-size: 3.2cqw; }
        .introspot-stage.vertical .chart .k { font-size: 2.8cqw; } .introspot-stage.vertical .bars { min-height: 16cqh; }
        .introspot-stage.vertical .phone { width: 46cqw; }
        .introspot-stage.vertical .ph-ic { width: 7cqw; height: 7cqw; font-size: 3.6cqw; border-radius: 2cqw; } .introspot-stage.vertical .ph-tx { font-size: 3.2cqw; } .introspot-stage.vertical .ph-tx :global(small) { font-size: 2.6cqw; } .introspot-stage.vertical .ph-amt { font-size: 3.6cqw; } .introspot-stage.vertical .pay-btn { font-size: 3.6cqw; padding: 3cqw; } .introspot-stage.vertical .notch { height: 2cqw; }
        .introspot-stage.vertical .stats3 { grid-template-columns: 1fr; gap: 3cqh; } .introspot-stage.vertical .stat .big { font-size: 17cqw; } .introspot-stage.vertical .stat .lab { font-size: 3.6cqw; }
        .introspot-stage.vertical .check { width: 18cqw; height: 18cqw; font-size: 10cqw; } .introspot-stage.vertical .pay-ok .msg { font-size: 4.4cqw; }

        @media (prefers-reduced-motion: reduce) {
          .glow, .bg-img { animation: none !important; }
          .bg-img.on { opacity: 1 !important; }
          .scene, .scene.active .stagger > :global(*), .pay-ok { transition-duration: .01ms !important; animation: none !important; }
          .pay-ok { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
