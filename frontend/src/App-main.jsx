import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Contract addresses from backend deployment
const THW_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const LIQUIDITY_POOL_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// THW Token ABI (simplified)
const THW_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Liquidity Pool ABI (simplified)
const POOL_ABI = [
  "function thwToken() view returns (address)",
  "function ethReserve() view returns (uint256)",
  "function thwReserve() view returns (uint256)",
  "function getPrice() view returns (uint256)",
  "function getReversePrice() view returns (uint256)",
  "function addInitialLiquidity(uint256 _thwAmount) external payable",
  "function swapETHForTHW() external payable",
  "function swapTHWForETH(uint256 _thwAmount) external",
  "event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 thwAmount)",
  "event TokensSwapped(address indexed user, uint256 ethIn, uint256 thwOut)"
];

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Contract instances
  const [thwToken, setThwToken] = useState(null);
  const [liquidityPool, setLiquidityPool] = useState(null);

  // Pool data
  const [ethReserve, setEthReserve] = useState("0");
  const [thwReserve, setThwReserve] = useState("0");
  const [userThwBalance, setUserThwBalance] = useState("0");
  const [currentPrice, setCurrentPrice] = useState("0");

  // Initialize contracts when wallet connects
  useEffect(() => {
    if (provider && account) {
      const tokenContract = new ethers.Contract(THW_TOKEN_ADDRESS, THW_TOKEN_ABI, signer);
      const poolContract = new ethers.Contract(LIQUIDITY_POOL_ADDRESS, POOL_ABI, signer);
      
      setThwToken(tokenContract);
      setLiquidityPool(poolContract);
      
      // Load initial data
      loadPoolData();
      loadUserBalance();
    }
  }, [provider, account, signer, loadPoolData, loadUserBalance]);

  const loadPoolData = useCallback(async () => {
    if (!provider) return;
    
    try {
      const poolContract = new ethers.Contract(LIQUIDITY_POOL_ADDRESS, POOL_ABI, provider);
      
      const ethRes = await poolContract.ethReserve();
      const thwRes = await poolContract.thwReserve();
      const price = await poolContract.getPrice();
      
      setEthReserve(ethers.formatEther(ethRes));
      setThwReserve(ethers.formatUnits(thwRes, 18));
      setCurrentPrice(ethers.formatUnits(price, 18));
    } catch (error) {
      console.error("Error loading pool data:", error);
    }
  }, [provider]);

  const loadUserBalance = useCallback(async () => {
    if (!provider || !account) return;
    
    try {
      const tokenContract = new ethers.Contract(THW_TOKEN_ADDRESS, THW_TOKEN_ABI, provider);
      const balance = await tokenContract.balanceOf(account);
      setUserThwBalance(ethers.formatUnits(balance, 18));
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  }, [provider, account]);

  // 1. Wallet Connect
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setAccount(accounts[0]);
        setProvider(provider);
        setSigner(signer);
        setStatus("Connected as Owner");
      } catch (err) {
        setStatus("Connection failed");
        console.error(err);
      }
    } else {
      alert("Install MetaMask!");
    }
  };

  // 2. Wallet Disconnect
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setThwToken(null);
    setLiquidityPool(null);
    setStatus("Disconnected");
    setEthReserve("0");
    setThwReserve("0");
    setUserThwBalance("0");
  };

  // 3. Add Initial Liquidity (0.5 ETH + 500 THW)
  const addLiquidity = async () => {
    if (!account || !liquidityPool) {
      alert("Connect wallet first!");
      return;
    }
    
    setLoading(true);
    setStatus("Processing Liquidity...");
    
    try {
      const thwAmount = ethers.parseUnits("500", 18); // 500 THW
      const ethAmount = ethers.parseEther("0.5"); // 0.5 ETH
      
      // First approve THW tokens
      setStatus("Approving THW tokens...");
      const approveTx = await thwToken.approve(LIQUIDITY_POOL_ADDRESS, thwAmount);
      await approveTx.wait();
      
      // Add liquidity
      setStatus("Adding liquidity to pool...");
      const liquidityTx = await liquidityPool.addInitialLiquidity(thwAmount, { value: ethAmount });
      await liquidityTx.wait();
      
      setStatus("✅ Liquidity Added Successfully!");
      
      // Reload data
      loadPoolData();
      loadUserBalance();
      
    } catch (error) {
      console.error("Error adding liquidity:", error);
      setStatus("❌ Error adding liquidity: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Swap ETH for THW
  const swapETHForTHW = async () => {
    if (!account || !liquidityPool) {
      alert("Connect wallet first!");
      return;
    }
    
    const ethAmount = prompt("Enter ETH amount to swap:");
    if (!ethAmount || parseFloat(ethAmount) <= 0) return;
    
    setLoading(true);
    setStatus("Swapping ETH for THW...");
    
    try {
      const swapTx = await liquidityPool.swapETHForTHW({ 
        value: ethers.parseEther(ethAmount) 
      });
      await swapTx.wait();
      
      setStatus("✅ Swap Successful!");
      loadPoolData();
      loadUserBalance();
      
    } catch (error) {
      console.error("Error swapping:", error);
      setStatus("❌ Error swapping: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Swap THW for ETH
  const swapTHWForETH = async () => {
    if (!account || !liquidityPool) {
      alert("Connect wallet first!");
      return;
    }
    
    const thwAmount = prompt("Enter THW amount to swap:");
    if (!thwAmount || parseFloat(thwAmount) <= 0) return;
    
    setLoading(true);
    setStatus("Swapping THW for ETH...");
    
    try {
      const amount = ethers.parseUnits(thwAmount, 18);
      
      // First approve THW tokens
      setStatus("Approving THW tokens...");
      const approveTx = await thwToken.approve(LIQUIDITY_POOL_ADDRESS, amount);
      await approveTx.wait();
      
      // Swap
      setStatus("Swapping tokens...");
      const swapTx = await liquidityPool.swapTHWForETH(amount);
      await swapTx.wait();
      
      setStatus("✅ Swap Successful!");
      loadPoolData();
      loadUserBalance();
      
    } catch (error) {
      console.error("Error swapping:", error);
      setStatus("❌ Error swapping: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "50px", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#2c3e50", marginBottom: "30px" }}>🚀 THW Decentralized Exchange</h1>
      
      {!account ? (
        <div style={cardStyle}>
          <h2>Connect Your Wallet</h2>
          <p>Please connect your MetaMask wallet to continue</p>
          <button onClick={connectWallet} style={btnStyle}>🔗 Connect Wallet</button>
        </div>
      ) : (
        <div>
          {/* Account Info */}
          <div style={cardStyle}>
            <h3>👤 Account Information</h3>
            <p><strong>Address:</strong> {account.slice(0, 6)}...{account.slice(-4)}</p>
            <p><strong>THW Balance:</strong> {parseFloat(userThwBalance).toFixed(2)} THW</p>
            <button onClick={disconnectWallet} style={disconnectBtn}>🔌 Disconnect</button>
          </div>

          {/* Pool Information */}
          <div style={cardStyle}>
            <h3>💧 Liquidity Pool Status</h3>
            <p><strong>ETH Reserve:</strong> {parseFloat(ethReserve).toFixed(4)} ETH</p>
            <p><strong>THW Reserve:</strong> {parseFloat(thwReserve).toFixed(2)} THW</p>
            <p><strong>Current Price:</strong> 1 ETH = {parseFloat(currentPrice).toFixed(2)} THW</p>
          </div>

          {/* Owner Controls */}
          <div style={cardStyle}>
            <h3>🏦 Owner Controls</h3>
            <p><strong>Add Initial Liquidity</strong></p>
            <p>Ratio: 1 ETH = 1000 THW</p>
            <button 
              onClick={addLiquidity} 
              style={liquidityBtn} 
              disabled={loading || parseFloat(ethReserve) > 0}
            >
              {loading ? "⏳ Processing..." : "💰 Add 0.5 ETH + 500 THW"}
            </button>
            {parseFloat(ethReserve) > 0 && (
              <p style={{ color: "orange", fontSize: "12px" }}>
                Initial liquidity already added
              </p>
            )}
          </div>

          {/* Trading Interface */}
          <div style={cardStyle}>
            <h3>💱 Trading Interface</h3>
            <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px" }}>
              <button 
                onClick={swapETHForTHW} 
                style={swapBtn} 
                disabled={loading}
              >
                🔄 ETH → THW
              </button>
              <button 
                onClick={swapTHWForETH} 
                style={swapBtn} 
                disabled={loading}
              >
                🔄 THW → ETH
              </button>
            </div>
          </div>

          {/* Status */}
          <div style={statusStyle}>
            <strong>Status:</strong> {status}
          </div>
        </div>
      )}
    </div>
  );
}

// CSS Styles
const cardStyle = { 
  border: "1px solid #ddd", 
  padding: "20px", 
  borderRadius: "10px", 
  margin: "20px auto",
  maxWidth: "500px",
  backgroundColor: "#f9f9f9",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
};

const btnStyle = { 
  padding: "12px 24px", 
  background: "linear-gradient(45deg, #3498db, #2980b9)", 
  color: "white", 
  borderRadius: "8px",
  border: "none",
  fontSize: "16px",
  cursor: "pointer",
  transition: "transform 0.2s"
};

const disconnectBtn = { 
  padding: "8px 16px", 
  background: "#e74c3c", 
  color: "white", 
  borderRadius: "5px",
  border: "none",
  cursor: "pointer",
  marginTop: "10px"
};

const liquidityBtn = { 
  padding: "12px 24px", 
  background: "linear-gradient(45deg, #27ae60, #229954)", 
  color: "white", 
  borderRadius: "8px",
  border: "none",
  fontSize: "16px",
  cursor: "pointer",
  transition: "transform 0.2s"
};

const swapBtn = {
  padding: "10px 20px",
  background: "linear-gradient(45deg, #f39c12, #e67e22)",
  color: "white",
  borderRadius: "8px",
  border: "none",
  fontSize: "14px",
  cursor: "pointer",
  transition: "transform 0.2s"
};

const statusStyle = {
  padding: "15px",
  borderRadius: "8px",
  backgroundColor: "#ecf0f1",
  border: "1px solid #bdc3c7",
  margin: "20px auto",
  maxWidth: "500px"
};

export default App;
