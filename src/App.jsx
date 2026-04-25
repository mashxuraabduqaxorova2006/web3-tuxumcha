import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import abi from './abi.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function App() {
  const [account,      setAccount]      = useState(null);
  const [isReady,      setIsReady]      = useState(false);
  const [clicks,       setClicks]       = useState(0);
  const [totalCracks,  setTotalCracks]  = useState(0);
  const [walletEGC,    setWalletEGC]    = useState('0');
  const [crackStage,   setCrackStage]   = useState(0); 
  const [isBroken,     setIsBroken]     = useState(false);
  const [showReward,   setShowReward]   = useState(false);
  const [rewardData,   setRewardData]   = useState({});
  const [isLoading,    setIsLoading]    = useState(false);
  const [clickPower,   setClickPower]   = useState(1);
  const [tab,          setTab]          = useState('game');

  const loadStats = useCallback((addr) => {
    const storageKey = `cyber_egg_v5_${addr}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{"cracks":0,"wallet":"0","power":1}');
    setTotalCracks(saved.cracks);
    setWalletEGC(saved.wallet);
    setClickPower(saved.power);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) { alert('MetaMask o\'rnating!'); return; }
    try {
      const accs = await window.ethereum.request({method:'eth_requestAccounts'});
      setAccount(accs[0]);
      loadStats(accs[0]);
      setIsReady(true);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({method:'eth_accounts'}).then(accs => {
        if (accs[0]) { setAccount(accs[0]); loadStats(accs[0]); setIsReady(true); }
      });
    }
  }, [loadStats]);

  const handleEggClick = () => {
    if (showReward || isBroken) return;
    
    setClicks(prev => {
      const next = prev + clickPower;
      
      // 50, 70, 80 Yoriqlar
      if (next >= 80) setCrackStage(3);
      else if (next >= 70) setCrackStage(2);
      else if (next >= 50) setCrackStage(1);

      if (next >= 100) {
        setIsBroken(true);
        setTimeout(() => {
          setRewardData({ reward: 10 });
          setShowReward(true);
        }, 1500);
        return 100; // 100% da to'xtaydi
      }
      return next;
    });
  };

  const buyUpgrade = (power, price) => {
    const bal = parseFloat(walletEGC);
    if (bal < price) { alert('Yetarli EGC mavjud emas!'); return; }
    
    const nextBal = (bal - price).toFixed(2);
    setWalletEGC(nextBal);
    setClickPower(power);
    
    const storageKey = `cyber_egg_v5_${account}`;
    localStorage.setItem(storageKey, JSON.stringify({ cracks: totalCracks, wallet: nextBal, power }));
    alert(`Xarid muvaffaqiyatli! Endi 1 click = ${power} ball!`);
  };

  const claimToBlockchain = () => {
    setIsLoading(true);
    setTimeout(() => {
      const nextCracks = totalCracks + 1;
      const nextWallet = (parseFloat(walletEGC) + 10).toFixed(2);
      setTotalCracks(nextCracks);
      setWalletEGC(nextWallet);
      
      const storageKey = `cyber_egg_v5_${account}`;
      localStorage.setItem(storageKey, JSON.stringify({ cracks: nextCracks, wallet: nextWallet, power: clickPower }));
      
      setIsLoading(false);
      setShowReward(false);
      setIsBroken(false);
      setCrackStage(0);
      setClicks(0); // Foizni nolga qaytarish
      alert('💰 BLOKCHEYN TASDIQLADI!');
    }, 2000);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsReady(false);
    setClicks(0);
    setCrackStage(0);
    setIsBroken(false);
    setShowReward(false);
  };

  const resetGame = () => {
    if (window.confirm("O'yinni noldan boshlamoqchimisiz? Barcha yutuqlaringiz o'chib ketadi!")) {
      setClicks(0);
      setTotalCracks(0);
      setWalletEGC('0');
      setClickPower(1);
      setCrackStage(0);
      setIsBroken(false);
      setShowReward(false);
      
      const storageKey = `cyber_egg_v5_${account}`;
      localStorage.removeItem(storageKey);
      alert("O'yin nollashtirildi!");
    }
  };

  if (!isReady) {
    return (
      <div className="auth-screen">
        <div className="scan-line"></div>
        <div className="auth-card">
          <h1 className="auth-title">AUTHENTICATION REQUIRED</h1>
          <p style={{marginBottom:'2rem', color:'#888', letterSpacing:'2px'}}>SYSTEM STATUS: LOCKED | Web3 Tuxumcha</p>
          <button className="auth-btn" onClick={connectWallet}>INITIALIZE METAMASK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-ui">
      <div className="cyber-world"><div className="grid-floor"></div></div>

      <header>
        <div className="cyber-logo">CYBER-SNAKE</div>
        <div className="wallet-display">
            <span>WALLET:</span> <b>{parseFloat(walletEGC).toFixed(1)} EGC</b>
            <button className="logout-mini-btn" onClick={disconnectWallet}>CHIQUISH</button>
        </div>
      </header>

      <main className="main-content">
        {tab === 'game' ? (
          <>
            <div className="hud hud-left">
              <div className="hud-box"><label>YORILGAN</label><span>{totalCracks}</span></div>
              <div className="hud-box"><label>CLICK KUCHI</label><span style={{color:'var(--neon-yellow)'}}>x{clickPower}</span></div>
            </div>

            <div className="egg-chamber">
              <div className="energy-aura"></div>
              <div className={`cyber-egg stage-${crackStage} ${isBroken ? 'broken' : ''}`} onClick={handleEggClick}>
                <svg className="crack-svg" viewBox="0 0 200 300">
                    {crackStage >= 1 && <path d="M100 20 Q120 80 90 120" stroke="black" strokeWidth="4" fill="none" opacity="0.8" />}
                    {crackStage >= 2 && <path d="M160 50 Q130 90 150 140" stroke="black" strokeWidth="4" fill="none" opacity="0.8" />}
                    {crackStage >= 3 && <path d="M40 60 Q70 100 50 150" stroke="black" strokeWidth="4" fill="none" opacity="0.8" />}
                </svg>
                <div className="egg-part top"></div>
                <div className="egg-part bottom"></div>
                <div className="snake-spawn">
                  <img src="/creature.png" alt="Snake" className="live-snake" />
                </div>
              </div>
            </div>

            <div className="progress-area">
                <div className="p-bar"><div className="p-fill" style={{width:`${clicks}%`}}></div></div>
                <span style={{fontFamily:'Orbitron', color:'var(--neon-yellow)'}}>{clicks}% PROGRESS</span>
            </div>
          </>
        ) : (
          <div className="shop-grid">
            <div className="shop-card">
              <div className="s-icon">🔨</div>
              <h3>KUMUSH BOLG'A</h3>
              <p>Click: x2</p>
              <div className="s-price">10 EGC</div>
              <button className="cyber-btn" onClick={()=>buyUpgrade(2, 10)} disabled={clickPower >= 2}>SOTIB OLISH</button>
            </div>
            <div className="shop-card">
              <div className="s-icon">⚒️</div>
              <h3>OLTIN BOLG'A</h3>
              <p>Click: x5</p>
              <div className="s-price">30 EGC</div>
              <button className="cyber-btn" onClick={()=>buyUpgrade(5, 30)} disabled={clickPower >= 5}>SOTIB OLISH</button>
            </div>
            <div className="shop-card">
              <div className="s-icon">🔱</div>
              <h3>OLMOS PARMAN</h3>
              <p>Click: x10</p>
              <div className="s-price">60 EGC</div>
              <button className="cyber-btn" onClick={()=>buyUpgrade(10, 60)} disabled={clickPower >= 10}>SOTIB OLISH</button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer-nav">
        <button className={tab==='game'?'active':''} onClick={()=>setTab('game')}>🎮 O'YIN</button>
        <button className={tab==='shop'?'active':''} onClick={()=>setTab('shop')}>🛒 DO'KON</button>
        <button className="reset-nav-btn" onClick={resetGame}>🔄 RESTART</button>
      </footer>

      <div className={`cyber-modal ${showReward ? 'show' : ''}`}>
        <div className="modal-content">
          <div style={{fontSize:'6rem', animation:'snake-wiggle 2s infinite'}}>🐍</div>
          <h2>ILONCHA TUG'ILDI!</h2>
          <div className="modal-val">+10 EGC</div>
          <div className="modal-btns">
            <button className="auth-btn" style={{width:'100%'}} onClick={claimToBlockchain} disabled={isLoading}>
                {isLoading ? 'TASDIQLANMOQDA...' : '⛓ BLOKCHEYNGA O\'TKAZISH'}
            </button>
            <button className="cyber-btn" style={{width:'100%', marginTop:'10px'}} onClick={()=>{setShowReward(false); setIsBroken(false); setClicks(0); setCrackStage(0);}}>DAVOM ETISH</button>
          </div>
        </div>
      </div>
    </div>
  );
}
