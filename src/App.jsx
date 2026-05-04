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
  const [blocks, setBlocks] = useState([]);
  const [isMining, setIsMining] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertAmount, setConvertAmount] = useState('');
  const [clickParticles, setClickParticles] = useState([]);
  const [combo, setCombo] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  // Leaderboard logic: Top 5 + You
  const getLeaderboard = () => {
    const mockPlayers = [
      { name: "CryptoKing", egc: 1250, cracks: 45 },
      { name: "EggHunter", egc: 980, cracks: 38 },
      { name: "Web3Master", egc: 750, cracks: 29 },
      { name: "Satoshi_Jr", egc: 540, cracks: 22 },
      { name: "MetaMiner", egc: 320, cracks: 15 },
    ];

    const you = { name: "Afsonaviy O'yinchi", egc: Math.floor(walletEGC), cracks: totalCracks, isYou: true };
    const all = [...mockPlayers, you].sort((a, b) => b.egc - a.egc);
    
    return all.map((p, i) => ({ ...p, rank: i + 1 }));
  };


  const EGC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const UZS_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const USD_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  const addTokenToMetaMask = async (address, symbol, decimals = 18) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: { address, symbol, decimals, image: '' },
        },
      });
    } catch (error) { console.error(error); }
  };

  const SK = (a) => `egg_v6_${a}`;

  const loadStats = useCallback((addr) => {
    const s = JSON.parse(localStorage.getItem(SK(addr)) || '{}');
    setTotalCracks(s.cracks || 0);
    setWalletEGC(s.egc || 0);
    setWalletUZS(s.uzs || 0);
    setWalletUSD(s.usd || 0);
    setWalletETH(s.eth || 0);
    setHistory(s.history || []);
    setBlocks(s.blocks || []);
  }, []);

  const save = (addr, egc, uzs, usd, eth, cracks, hist, blks) => {
    const b = blks || blocks;
    localStorage.setItem(SK(addr), JSON.stringify({ egc, uzs, usd, eth, cracks, history: hist, blocks: b }));
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

  const proceedClaim = async () => {
    setShowClaimModal(false); setIsLoading(true); setIsMining(true);
    await new Promise(r => setTimeout(r, 2500));
    const newEGC = walletEGC + 10;
    const newCracks = totalCracks + 1;
    const h = mkEntry('CHAIN_SYNC', '+10 EGC');
    
    // Add block
    const index = blocks.length > 0 ? blocks[0].index + 1 : 1;
    const hash = "0x0000" + Array.from({length: 60}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const prevHash = blocks.length > 0 ? blocks[0].hash : "0x" + "0".repeat(64);
    const nonce = Math.floor(Math.random() * 100000);
    const newBlock = { index, hash, prevHash, nonce, amount: 10, time: new Date().toLocaleTimeString() };
    const newBlocks = [newBlock, ...blocks];
    
    setWalletEGC(newEGC); setTotalCracks(newCracks); setHistory(h); setBlocks(newBlocks);
    save(account, newEGC, walletUZS, walletUSD, walletETH, newCracks, h, newBlocks);
    setIsLoading(false); setIsMining(false); setIsBroken(false); setCrackStage(0); setClicks(0);
    
    setTimeout(() => {
      document.getElementById('bcSection')?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };

  const handleDailyClaim = () => {
    if (dailyClaimed) return;
    const bonus = 5;
    const newEGC = walletEGC + bonus;
    const h = mkEntry('DAILY_REWARD', `+${bonus} EGC`);
    setWalletEGC(newEGC); setDailyClaimed(true); setHistory(h);
    save(account, newEGC, walletUZS, walletUSD, walletETH, totalCracks, h);
    alert('Kunlik bonus: +5 EGC! 🎁');
  };

  const handleEggClick = (e) => {
    if (isLoading || isMining || isBroken || showClaimModal) return;

    const now = Date.now();
    if (now - lastClickTime < 400) setCombo(prev => Math.min(prev + 1, 50));
    else setCombo(0);
    setLastClickTime(now);

    const id = Date.now();
    const x = e.clientX || window.innerWidth / 2;
    const y = e.clientY || window.innerHeight / 2;
    setClickParticles(prev => [...prev, { id, x, y }]);
    setTimeout(() => setClickParticles(prev => prev.filter(p => p.id !== id)), 800);

    setClicks(prev => {
      const n = prev + 1;
      if (n >= 80) setCrackStage(3); else if (n >= 70) setCrackStage(2); else if (n >= 50) setCrackStage(1);
      if (n >= 100) { setIsBroken(true); setTimeout(() => setShowClaimModal(true), 2000); return 100; }
      return n;
    });
  };

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
    if (n > walletEGC) { alert(`Yetarli EGC yo'q!`); return; }
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
            <div className="balances-bar glass-panel">
              <div className="bal-item">
                <span className="b-label">EGC <button className="fox-btn" onClick={() => addTokenToMetaMask(EGC_ADDRESS, "EGC")}>🦊</button></span>
                <span className="b-val text-neon">{walletEGC.toFixed(2)}</span>
              </div>
              <div className="bal-item bal-convertible">
                <span className="b-label">UZS <button className="fox-btn" onClick={() => addTokenToMetaMask(UZS_ADDRESS, "UZS")}>🦊</button></span>
                <span className="b-val">{Math.floor(walletUZS).toLocaleString()}</span>
                <button className="convert-btn" onClick={() => openConvert('UZS')}>⇄ O'tkazish</button>
              </div>
              <div className="bal-item bal-convertible">
                <span className="b-label">USD <button className="fox-btn" onClick={() => addTokenToMetaMask(USD_ADDRESS, "USDT")}>🦊</button></span>
                <span className="b-val">${walletUSD.toFixed(2)}</span>
                <button className="convert-btn" onClick={() => openConvert('USD')}>⇄ O'tkazish</button>
              </div>
              <div className="bal-item bal-convertible">
                <span className="b-label">ETH</span>
                <span className="b-val">{walletETH.toFixed(6)}</span>
                <button className="convert-btn" onClick={() => openConvert('ETH')}>⇄ O'tkazish</button>
              </div>
            </div>

            <div className="rates-info glass-panel-sm">
              <span>1 EGC = {RATES.UZS} UZS</span><span>|</span>
              <span>1 EGC = ${RATES.USD}</span><span>|</span>
              <span>1 EGC = {RATES.ETH} ETH</span>
            </div>

            <div className="egg-container">
              <div className="stats-hud"><div className="stat">YORILGAN: <span>{totalCracks}</span></div></div>
              <div className="egg-wrapper">
                {isMining && (
                  <div className="mining-spinner">
                    <div className="spinner-ring"/><span>BLOKCHEYNGA O'TKAZILMOQDA...</span>
                  </div>
                )}
                <div className={`cyber-egg stage-${crackStage} ${isBroken?'broken':''} ${isMining?'mining':''} ${combo > 10 ? 'on-fire' : ''}`} onClick={handleEggClick}>
                  <svg className="crack-svg" viewBox="0 0 200 300">
                    {crackStage>=1&&<path d="M100 20 Q120 80 90 120" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6"/>}
                    {crackStage>=2&&<path d="M160 50 Q130 90 150 140" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6"/>}
                    {crackStage>=3&&<path d="M40 60 Q70 100 50 150" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6"/>}
                  </svg>
                  <div className="egg-part top"/><div className="egg-part bottom"/>
                  <div className="snake-spawn"><img src={creatureImg} alt="creature" className="live-snake"/></div>
                  {!isBroken && <div className="egg-glow" style={{opacity: clicks / 100}}></div>}
                  {combo > 2 && <div className="combo-badge">COMBO x{combo}</div>}
                </div>
                {clickParticles.map(p => (
                  <div key={p.id} className="click-particle" style={{ left: p.x, top: p.y }}>+1</div>
                ))}
              </div>
              <div className="progress-container">
                <div className="premium-pbar"><div className="premium-pfill" style={{width:`${clicks}%`}}/></div>
                <div className="p-text">{clicks}%</div>
              </div>
            </div>

            {blocks.length > 0 && (
              <section className="blockchain-section" id="bcSection">
                <h2>🔗 Immutable Blockchain Ledger</h2>
                <div className="blockchain-list">
                  {blocks.map((b, i) => (
                    <div key={b.hash} className="block-wrapper">
                      {i !== 0 && <div className="block-connector"></div>}
                      <div className="block-item">
                        <div className="block-header">
                          <span className="block-number">Block #{b.index}</span>
                          <span className="block-time">{b.time}</span>
                        </div>
                        <div className="block-body">
                          <div className="data-row">
                            <span className="label">CURRENT HASH (SHA-256)</span>
                            <span className="value-mono">{b.hash}</span>
                          </div>
                          <div className="data-row">
                            <span className="label">PREVIOUS HASH</span>
                            <span className="value-mono">{b.prevHash}</span>
                          </div>
                          <div className="data-row">
                            <span className="label">PROOF (NONCE)</span>
                            <span className="value-mono">{b.nonce}</span>
                          </div>
                        </div>
                        <div className="block-body-bottom">
                          <div className="data-row">
                            <span className="label">BLOCK REWARD</span>
                            <span className="value-mono reward">{b.amount} MNT</span>
                          </div>
                          <div className="data-row">
                            <span className="label">MINER</span>
                            <span className="value-mono">{account ? account.substring(0, 8) + "..." : "0x000..."}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        ) : tab === 'history' ? (
          <div className="history-view">
            <div className="glass-panel history-panel">
              <h2>📜 TRANZAKSIYALAR TARIXI</h2>
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
        ) : tab === 'leaderboard' ? (
          <div className="history-view">
            <div className="glass-panel history-panel">
              <h2>🏆 KUCHLI O'YINCHILAR</h2>
              <div className="leaderboard-list">
                {getLeaderboard().map(u => (
                  <div key={u.rank} className={`leader-row ${u.rank <= 3 ? `top-${u.rank}` : ''} ${u.isYou ? 'is-you' : ''}`}>
                    <div className="l-rank">{u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : u.rank}</div>
                    <div className="l-name">{u.name}</div>
                    <div className="l-stats">
                      <span className="l-cracks">🥚 {u.cracks}</span>
                      <span className="l-egc text-neon">{u.egc} EGC</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : (
          <div className="history-view">
            <div className="glass-panel history-panel">
              <h2>🎯 MISSIONS & QUESTS</h2>
              <div className="missions-list">
                <div className="mission-card glass-panel-sm">
                  <div className="m-info"><h3>Kunlik Kirish</h3><p>Har kuni o'yinga kiring va bonus oling.</p></div>
                  <button className={`premium-btn ${dailyClaimed?'disabled':''}`} onClick={handleDailyClaim} disabled={dailyClaimed}>
                    {dailyClaimed ? 'Olingan' : 'Olish (+5 EGC)'}
                  </button>
                </div>
                <div className="mission-card glass-panel-sm disabled">
                  <div className="m-info"><h3>Birinchi 100ta Tuxum</h3><p>Hali bajarmagan: {totalCracks}/100</p></div>
                  <button className="secondary-btn" disabled>Yaqinda</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showClaimModal && (
        <div className="modal-overlay">
          <div className="glass-panel custom-modal">
            <div className="modal-icon">🥚</div>
            <h2>TUXUM YORILDI!</h2>
            <p><strong>+10 EGC</strong> mukofot tayyor!</p>
            <div className="modal-actions">
              <button className="premium-btn action-btn chain-btn" onClick={proceedClaim}>⛓ Blokcheynga o'tkazish</button>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && convertTarget && (
        <div className="modal-overlay">
          <div className="glass-panel custom-modal convert-modal">
            <div className="modal-icon">💱</div>
            <h2>EGC → {convertTarget}</h2>
            <div className="convert-form">
              <input type="number" value={convertAmount} onChange={e => setConvertAmount(e.target.value)} className="convert-input" placeholder="0"/>
              <div className="convert-preview">{preview(convertAmount) || 'Miqdor kiriting'}</div>
            </div>
            <div className="modal-actions">
              <button className="premium-btn action-btn" onClick={doConvert}>✓ O'tkazish</button>
              <button className="secondary-btn action-btn" onClick={()=>setShowConvertModal(false)}>Bekor qilish</button>
            </div>
          </div>
        </div>
      )}

      <footer className="glass-footer">
        <button className={`tab-btn ${tab==='game'?'active':''}`} onClick={()=>setTab('game')}>🎮 O'YIN</button>
        <button className={`tab-btn ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}>📜 TARIX</button>
        <button className={`tab-btn ${tab==='leaderboard'?'active':''}`} onClick={()=>setTab('leaderboard')}>🏆 REYTING</button>
        <button className={`tab-btn ${tab==='missions'?'active':''}`} onClick={()=>setTab('missions')}>🎯 MISSALAN</button>
      </footer>
    </div>
  );
}
