import React, { useState, useEffect, useCallback } from 'react';
import creatureImg from '/creature.png';

const RATES = { USD: 0.05, UZS: 635, ETH: 0.000016 };

export default function App() {
  const [account, setAccount] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [totalCracks, setTotalCracks] = useState(0);
  const [walletEGC, setWalletEGC] = useState(0);
  const [walletUZS, setWalletUZS] = useState(0);
  const [walletUSD, setWalletUSD] = useState(0);
  const [walletETH, setWalletETH] = useState(0);
  const [crackStage, setCrackStage] = useState(0);
  const [isBroken, setIsBroken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState('game');
  const [history, setHistory] = useState([]);
  const [isMining, setIsMining] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertAmount, setConvertAmount] = useState('');

  const SK = (a) => `egg_v6_${a}`;

  const loadStats = useCallback((addr) => {
    const s = JSON.parse(localStorage.getItem(SK(addr)) || '{}');
    setTotalCracks(s.cracks || 0);
    setWalletEGC(s.egc || 0);
    setWalletUZS(s.uzs || 0);
    setWalletUSD(s.usd || 0);
    setWalletETH(s.eth || 0);
    setHistory(s.history || []);
  }, []);

  const save = (addr, egc, uzs, usd, eth, cracks, hist) => {
    localStorage.setItem(SK(addr), JSON.stringify({ egc, uzs, usd, eth, cracks, history: hist }));
  };

  const connectWallet = async () => {
    if (!window.ethereum) { alert("MetaMask o'rnating!"); return; }
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accs[0]); loadStats(accs[0]); setIsReady(true);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    (async () => {
      if (window.ethereum) {
        const accs = await window.ethereum.request({ method: 'eth_accounts' });
        if (accs.length > 0) { setAccount(accs[0]); loadStats(accs[0]); setIsReady(true); }
      }
    })();
  }, [loadStats]);

  const mkEntry = (type, amount, hist) => {
    const e = { id: Date.now(), type, amount, hash: `0x${Math.random().toString(16).slice(2,42)}`, time: new Date().toLocaleTimeString() };
    return [e, ...(hist || history)].slice(0, 30);
  };

  // ── TUXUM YORILDI: faqat bitta tugma ──────────────────────────
  const proceedClaim = async () => {
    setShowClaimModal(false);
    setIsLoading(true);
    setIsMining(true);
    await new Promise(r => setTimeout(r, 2500));
    const newEGC = walletEGC + 10;
    const newCracks = totalCracks + 1;
    const h = mkEntry('CHAIN_SYNC', '+10 EGC');
    setWalletEGC(newEGC); setTotalCracks(newCracks); setHistory(h);
    save(account, newEGC, walletUZS, walletUSD, walletETH, newCracks, h);
    setIsLoading(false); setIsMining(false); setIsBroken(false); setCrackStage(0); setClicks(0);
  };

  const handleEggClick = () => {
    if (isLoading || isMining || isBroken || showClaimModal) return;
    setClicks(prev => {
      const n = prev + 1;
      if (n >= 80) setCrackStage(3); else if (n >= 70) setCrackStage(2); else if (n >= 50) setCrackStage(1);
      if (n >= 100) { setIsBroken(true); setTimeout(() => setShowClaimModal(true), 2000); return 100; }
      return n;
    });
  };

  // ── KONVERTATSIYA ─────────────────────────────────────────────
  const openConvert = (cur) => { setConvertTarget(cur); setConvertAmount(''); setShowConvertModal(true); };

  const preview = (amt) => {
    const n = parseFloat(amt);
    if (!n || n <= 0) return null;
    if (convertTarget === 'UZS') return `≈ ${Math.floor(n * RATES.UZS).toLocaleString()} UZS`;
    if (convertTarget === 'USD') return `≈ $${(n * RATES.USD).toFixed(2)}`;
    if (convertTarget === 'ETH') return `≈ ${(n * RATES.ETH).toFixed(6)} ETH`;
  };

  const doConvert = () => {
    const n = parseFloat(convertAmount);
    if (!n || n <= 0) { alert('Miqdor kiriting!'); return; }
    if (n > walletEGC) { alert(`Yetarli EGC yo'q! Sizda ${walletEGC.toFixed(2)} EGC bor.`); return; }
    const newEGC = walletEGC - n;
    let uz = walletUZS, ud = walletUSD, et = walletETH, gained = '';
    if (convertTarget === 'UZS') { uz += n * RATES.UZS; gained = `+${Math.floor(n*RATES.UZS).toLocaleString()} UZS`; }
    if (convertTarget === 'USD') { ud += n * RATES.USD; gained = `+$${(n*RATES.USD).toFixed(2)}`; }
    if (convertTarget === 'ETH') { et += n * RATES.ETH; gained = `+${(n*RATES.ETH).toFixed(6)} ETH`; }
    const h = mkEntry(`EGC→${convertTarget}`, gained);
    setWalletEGC(newEGC); setWalletUZS(uz); setWalletUSD(ud); setWalletETH(et); setHistory(h);
    save(account, newEGC, uz, ud, et, totalCracks, h);
    setShowConvertModal(false); setConvertAmount('');
  };

  if (!isReady) return (
    <div className="login-screen">
      <div className="glass-panel login-card">
        <h1>TUXUMCHA</h1><p>Web3 O'yini</p>
        <button className="premium-btn" onClick={connectWallet}>MetaMask orqali kirish</button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="bg-orb orb-1"/><div className="bg-orb orb-2"/>
      <header className="glass-header">
        <div className="logo">TUXUMCHA</div>
        <div className="header-right">
          <div className="account-badge">{account.slice(0,6)}...{account.slice(-4)}</div>
          <button className="icon-btn" onClick={() => { setAccount(null); setIsReady(false); }}>⏻</button>
        </div>
      </header>

      <main className="main-content">
        {tab === 'game' ? (
          <div className="game-view">
            {/* Balanslar */}
            <div className="balances-bar glass-panel">
              <div className="bal-item">
                <span className="b-label">EGC</span>
                <span className="b-val text-neon">{walletEGC.toFixed(2)}</span>
              </div>
              <div className="bal-item bal-convertible">
                <span className="b-label">UZS</span>
                <span className="b-val">{Math.floor(walletUZS).toLocaleString()}</span>
                <button className="convert-btn" onClick={() => openConvert('UZS')}>⇄ O'tkazish</button>
              </div>
              <div className="bal-item bal-convertible">
                <span className="b-label">USD</span>
                <span className="b-val">${walletUSD.toFixed(2)}</span>
                <button className="convert-btn" onClick={() => openConvert('USD')}>⇄ O'tkazish</button>
              </div>
              <div className="bal-item bal-convertible">
                <span className="b-label">ETH</span>
                <span className="b-val">{walletETH.toFixed(6)}</span>
                <button className="convert-btn" onClick={() => openConvert('ETH')}>⇄ O'tkazish</button>
              </div>
            </div>

            {/* Kurs */}
            <div className="rates-info glass-panel-sm">
              <span>1 EGC = {RATES.UZS} UZS</span><span>|</span>
              <span>1 EGC = ${RATES.USD}</span><span>|</span>
              <span>1 EGC = {RATES.ETH} ETH</span>
            </div>

            {/* Tuxum */}
            <div className="egg-container">
              <div className="stats-hud"><div className="stat">YORILGAN: <span>{totalCracks}</span></div></div>
              <div className="egg-wrapper">
                {isMining && (
                  <div className="mining-spinner">
                    <div className="spinner-ring"/><span>BLOKCHEYNGA O'TKAZILMOQDA...</span>
                  </div>
                )}
                <div className={`cyber-egg stage-${crackStage} ${isBroken?'broken':''} ${isMining?'mining':''}`} onClick={handleEggClick}>
                  <svg className="crack-svg" viewBox="0 0 200 300">
                    {crackStage>=1&&<path d="M100 20 Q120 80 90 120" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6"/>}
                    {crackStage>=2&&<path d="M160 50 Q130 90 150 140" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6"/>}
                    {crackStage>=3&&<path d="M40 60 Q70 100 50 150" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6"/>}
                  </svg>
                  <div className="egg-part top"/><div className="egg-part bottom"/>
                  <div className="snake-spawn"><img src={creatureImg} alt="creature" className="live-snake"/></div>
                </div>
              </div>
              <div className="progress-container">
                <div className="premium-pbar"><div className="premium-pfill" style={{width:`${clicks}%`}}/></div>
                <div className="p-text">{clicks}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="history-view">
            <div className="glass-panel history-panel">
              <h2>TRANZAKSIYALAR TARIXI</h2>
              <div className="history-list">
                {history.length === 0 ? <p className="no-data">Hali tranzaksiyalar yo'q.</p>
                  : history.map(h => (
                    <div key={h.id} className="history-row">
                      <div className="h-info">
                        <span className={`h-type ${h.type.toLowerCase().replace('→','_')}`}>{h.type}</span>
                        <span className="h-time">{h.time}</span>
                      </div>
                      <div className="h-amount text-neon">{h.amount}</div>
                      <div className="h-hash">{h.hash.slice(0,20)}...</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── TUXUM YORILDI MODALI ── */}
      {showClaimModal && (
        <div className="modal-overlay">
          <div className="glass-panel custom-modal">
            <div className="modal-icon">🥚</div>
            <h2>TUXUM YORILDI!</h2>
            <p><strong>+10 EGC</strong> mukofot tayyor!</p>
            <p className="modal-sub">Qayerga saqlash?</p>
            <div className="modal-actions">
              <button className="premium-btn action-btn chain-btn" onClick={proceedClaim}>
                ⛓ Blokcheynga o'tkazish
                <small>Mining bilan tasdiqlash (~2 soniya)</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KONVERTATSIYA MODALI ── */}
      {showConvertModal && convertTarget && (
        <div className="modal-overlay">
          <div className="glass-panel custom-modal convert-modal">
            <div className="modal-icon">💱</div>
            <h2>EGC → {convertTarget}</h2>
            <div className="convert-rate-badge">
              1 EGC = {convertTarget==='UZS'?`${RATES.UZS} UZS`:convertTarget==='USD'?`$${RATES.USD}`: `${RATES.ETH} ETH`}
            </div>
            <div className="convert-form">
              <label>Necha EGC sarflansin?</label>
              <div className="convert-input-row">
                <input id="cvt-inp" type="number" min="1" max={walletEGC} value={convertAmount}
                  onChange={e => setConvertAmount(e.target.value)} className="convert-input" placeholder="0"/>
                <span className="egc-tag">EGC</span>
              </div>
              <div className="convert-arrow">↓</div>
              <div className="convert-preview">
                {preview(convertAmount)
                  ? <span className="preview-val text-neon">{preview(convertAmount)}</span>
                  : <span className="preview-empty">Miqdor kiriting</span>}
              </div>
              <div className="egc-available">Mavjud: <strong>{walletEGC.toFixed(2)} EGC</strong></div>
            </div>
            <div className="quick-amounts">
              {[5,10,20,50].filter(v=>v<=walletEGC).map(v=>(
                <button key={v} className="quick-btn" onClick={()=>setConvertAmount(String(v))}>{v} EGC</button>
              ))}
              {walletEGC>0&&<button className="quick-btn" onClick={()=>setConvertAmount(walletEGC.toFixed(2))}>Barchasi</button>}
            </div>
            <div className="modal-actions">
              <button className="premium-btn action-btn" onClick={doConvert}>✓ O'tkazish</button>
              <button className="secondary-btn action-btn" onClick={()=>{setShowConvertModal(false);setConvertAmount('');}}>Bekor qilish</button>
            </div>
          </div>
        </div>
      )}

      <footer className="glass-footer">
        <button className={`tab-btn ${tab==='game'?'active':''}`} onClick={()=>setTab('game')}>O'YIN</button>
        <button className={`tab-btn ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}>TARIX</button>
      </footer>
    </div>
  );
}
