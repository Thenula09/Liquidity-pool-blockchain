import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import contractInfo from '../../contracts/contract-info.json';
import SimplePoolABI from '../../contracts/SimplePoolABI.json';

const TraderDashboard = () => {
    const [account, setAccount] = useState(null);
    const [poolContract, setPoolContract] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Pool data
    const [totalTHW, setTotalTHW] = useState(0);
    const [totalETH, setTotalETH] = useState(0);
    const [currentPrice, setCurrentPrice] = useState(0);
    
    // Chart data
    const [chartData, setChartData] = useState([]);
    
    // Swap states
    const [swapMode, setSwapMode] = useState('buy'); // 'buy' or 'sell'
    const [thwReceive, setThwReceive] = useState(''); // THW amount user wants to receive
    const [ethPay, setEthPay] = useState(''); // ETH amount needed to pay (calculated)
    const [priceImpact, setPriceImpact] = useState(0); // Price impact percentage

    // THW gana enter karana kota ETH gana calculate karana function eka
    const handleTHWChange = (e) => {
        const thwAmount = parseFloat(e.target.value) || 0;
        setThwReceive(e.target.value);

        const poolETH = parseFloat(totalETH) || 0;
        const poolTHW = parseFloat(totalTHW) || 0;

        if (thwAmount > 0 && poolTHW > 0 && poolTHW > thwAmount) {
            // Constant Product Formula: ETH_needed = (ETH_pool * THW_out) / (THW_pool - THW_out) * (1 + fee)
            const fee = 0.003; // 0.3% fee
            
            // Calculate ETH needed without fee
            const ethNeeded = (poolETH * thwAmount) / (poolTHW - thwAmount);
            
            // Add fee
            const ethWithFee = ethNeeded * (1 + fee);
            
            // Calculate price impact
            const currentPriceETH = poolETH / poolTHW;
            const newPriceETH = (poolETH + ethNeeded) / (poolTHW - thwAmount);
            const impact = ((newPriceETH - currentPriceETH) / currentPriceETH) * 100;
            
            setEthPay(ethWithFee.toFixed(6));
            setPriceImpact(Math.abs(impact).toFixed(2));
        } else {
            setEthPay('0');
            setPriceImpact(0);
        }
    };

    // Load pool data
    const loadPoolData = useCallback(async () => {
        if (!poolContract) return;
        
        try {
            const [ethInPool, tokensInPool, price] = await Promise.all([
                poolContract.totalEthInPool(),
                poolContract.totalTokensInPool(),
                poolContract.getPrice()
            ]);
            
            setTotalETH(ethers.formatEther(ethInPool));
            setTotalTHW(ethers.formatUnits(tokensInPool, 18));
            setCurrentPrice(ethers.formatUnits(price, 18));
        } catch (error) {
            console.error("Error loading pool data:", error);
        }
    }, [poolContract]);

    // Initialize contract
    useEffect(() => {
        const initContract = async () => {
            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const contract = new ethers.Contract(contractInfo.poolAddress, SimplePoolABI, provider);
                    setPoolContract(contract);
                    console.log("Contract initialized successfully");
                } catch (error) {
                    console.error("Error initializing contract:", error);
                }
            }
        };

        initContract();
    }, []); // Remove dependency to prevent infinite loop

    // Load initial data when contract is set
    useEffect(() => {
        if (poolContract) {
            loadPoolData();
        }
    }, [poolContract, loadPoolData]);

    // Real-time price fetching for chart
    useEffect(() => {
        const fetchPrice = async () => {
            if (poolContract) {
                try {
                    const ethReserves = await poolContract.totalEthInPool();
                    const thwReserves = await poolContract.totalTokensInPool();

                    const ethAmount = parseFloat(ethers.formatEther(ethReserves));
                    const thwAmount = parseFloat(ethers.formatUnits(thwReserves, 18));

                    // Calculate price: 1 THW = ? ETH
                    let currentPrice = 0;
                    if (thwAmount > 0) {
                        currentPrice = ethAmount / thwAmount;
                    }

                    const newDataPoint = {
                        time: new Date().toLocaleTimeString(),
                        price: currentPrice.toFixed(6)
                    };

                    setChartData(prev => {
                        const newData = [...prev, newDataPoint];
                        // Keep last 20 points and ensure we have multiple points for chart
                        if (newData.length > 20) {
                            return newData.slice(-20);
                        }
                        return newData;
                    });
                } catch (err) {
                    console.error("Price fetch error:", err);
                }
            }
        };

        // Initial data generation
        const generateInitialData = () => {
            const initialData = [];
            const basePrice = 0.000668;
            
            for (let i = 0; i < 10; i++) {
                const variation = (Math.random() - 0.5) * 0.0001;
                const price = (basePrice + variation).toFixed(6);
                const time = new Date(Date.now() - (9 - i) * 60000).toLocaleTimeString();
                
                initialData.push({ time, price });
            }
            
            setChartData(initialData);
        };

        generateInitialData();
        const interval = setInterval(fetchPrice, 3000);
        return () => clearInterval(interval);
    }, [poolContract]);

    // Connect wallet
    const connectWallet = async () => {
        try {
            if (typeof window !== 'undefined' && window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                setAccount(accounts[0]);
                console.log("Wallet connected:", accounts[0]);
            }
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Failed to connect wallet");
        }
    };

    // --- 1. Buy THW (ETH යවලා THW ටෝකන් ලබා ගැනීම) ---
    const handleBuy = async () => {
        if (!thwReceive || isNaN(thwReceive)) return alert("Please enter a valid THW amount");
        if (!account || !poolContract) return alert("Please connect wallet first");

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = poolContract.connect(signer);

            const ethAmountWei = ethers.parseEther(ethPay);

            console.log("Swapping ETH for THW...");
            // Using the actual contract function: swapETHForTHW
            const tx = await contract.swapETHForTHW({ value: ethAmountWei });
            
            await tx.wait();
            alert("Buy Successful! THW added to your wallet.");
            setThwReceive("");
            setEthPay("");
            setPriceImpact(0);
            loadPoolData(); // Update chart and pool data
        } catch (err) {
            console.error("Buy Error:", err);
            alert("Transaction Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Sell THW (THW ටෝකන් දීලා ETH ලබා ගැනීම) ---
    const handleSell = async () => {
        if (!thwReceive || isNaN(thwReceive)) return alert("Please enter a valid THW amount");
        if (!account || !poolContract) return alert("Please connect wallet first");

        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // පියවර A: THW Token Contract එකෙන් Approve ලබා ගැනීම
            const tokenContract = new ethers.Contract(contractInfo.tokenAddress, [
                "function approve(address spender, uint256 amount) returns (bool)"
            ], signer);
            const thwAmountWei = ethers.parseUnits(thwReceive, 18);

            console.log("Approving THW for sale...");
            const approveTx = await tokenContract.approve(contractInfo.poolAddress, thwAmountWei);
            await approveTx.wait();

            // පියවර B: Swap Function එක Call කිරීම
            const mainContract = poolContract.connect(signer);
            console.log("Swapping THW for ETH...");
            const tx = await mainContract.swapTHWForETH(thwAmountWei);
            
            await tx.wait();
            alert("Sell Successful! ETH sent to your wallet.");
            setThwReceive("");
            setEthPay("");
            setPriceImpact(0);
            loadPoolData(); // Update chart and pool data
        } catch (err) {
            console.error("Sell Error:", err);
            alert("Transaction Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Pool info object for compatibility
    const poolInfo = {
        price: currentPrice || "0.000668",
        thw: parseFloat(totalTHW || 299).toLocaleString(),
        eth: parseFloat(totalETH || 0.2).toFixed(4)
    };

    return (
        <div className="min-h-screen bg-[#0b0e11] text-white p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                
                {/* Header - Wallet Connection */}
                <div className="flex justify-between items-center mb-8 bg-[#161a1e] p-4 rounded-2xl border border-gray-800">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-3 h-3 bg-[#00ff88] rounded-full animate-pulse"></span>
                        THW Trader Terminal
                    </h1>
                    {!account ? (
                        <button onClick={connectWallet} disabled={loading} className="bg-[#00ff88] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#00e67a] transition-all disabled:opacity-50">
                            {loading ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    ) : (
                        <div className="text-sm font-mono text-gray-400 bg-black/40 px-4 py-2 rounded-xl border border-gray-800">
                            {account.slice(0,6)}...{account.slice(-4)}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Live Market Chart */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#161a1e] p-6 rounded-3xl border border-gray-800 shadow-2xl">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Current Market Price</p>
                                    <h2 className="text-3xl font-bold text-[#00ff88] font-mono">
                                        {poolInfo.price} <span className="text-sm text-gray-500 font-normal">ETH</span>
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Pool Liquidity</p>
                                    <p className="text-white font-medium">{poolInfo.thw} THW / {poolInfo.eth} ETH</p>
                                </div>
                            </div>

                            {/* Chart Container */}
                            <div className="h-[350px] w-full mt-4 min-w-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="traderColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2b2f36" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#161a1e', border: '1px solid #2b2f36', borderRadius: '12px'}}
                                            itemStyle={{color: '#00ff88'}}
                                        />
                                        <Area type="monotone" dataKey="price" stroke="#00ff88" fill="url(#traderColor)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right: Swap/Trading Box */}
                    <div className="bg-[#161a1e] p-6 rounded-3xl border border-gray-800 shadow-2xl h-fit">
                        <div className="flex bg-black/40 p-1.5 rounded-2xl mb-8">
                            <button 
                                onClick={() => setSwapMode('buy')}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${swapMode === 'buy' ? 'bg-[#1e2329] text-[#00ff88] shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            > Buy </button>
                            <button 
                                onClick={() => setSwapMode('sell')}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${swapMode === 'sell' ? 'bg-[#1e2329] text-red-500 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            > Sell </button>
                        </div>

                        <div className="space-y-5">
                            <div className="bg-black/20 p-4 rounded-2xl border border-gray-800">
                                <label className="text-xs text-gray-500 font-bold mb-2 block uppercase">You Receive (THW)</label>
                                <div className="flex items-center">
                                    <input 
                                        type="number"
                                        value={thwReceive}
                                        onChange={handleTHWChange}
                                        placeholder="0.0"
                                        disabled={loading || !account}
                                        className="bg-transparent text-2xl font-bold w-full focus:outline-none placeholder:text-gray-700 disabled:opacity-50"
                                    />
                                    <span className="text-lg font-bold text-gray-400">THW</span>
                                </div>
                                {parseFloat(thwReceive) > 0 && parseFloat(totalTHW) > 0 && parseFloat(thwReceive) > parseFloat(totalTHW) && (
                                    <p className="text-red-500 text-xs mt-2">Not enough liquidity in pool</p>
                                )}
                            </div>

                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="bg-[#1e2329] p-2 rounded-full border border-gray-800 text-[#00ff88]">
                                    ↓
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-2xl border border-gray-800">
                                <label className="text-xs text-gray-500 font-bold mb-2 block uppercase">You Pay (ETH)</label>
                                <div className="flex items-center">
                                    <p className="text-2xl font-bold w-full text-white">
                                        {ethPay || "0.00"}
                                    </p>
                                    <span className="text-lg font-bold text-gray-400">ETH</span>
                                </div>
                            </div>

                            <button 
                                onClick={swapMode === 'buy' ? handleBuy : handleSell}
                                disabled={loading || !account || !thwReceive || (parseFloat(totalTHW) > 0 && parseFloat(thwReceive) > parseFloat(totalTHW))}
                                className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transform active:scale-95 transition-all ${
                                    swapMode === 'buy' 
                                    ? 'bg-[#00ff88] hover:bg-[#00e67a] text-black shadow-[#00ff88]/10' 
                                    : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading ? 'Processing...' : (swapMode === 'buy' ? 'CONFIRM BUY (SWAP ETH)' : 'CONFIRM SELL (SWAP THW)')}
                            </button>
                        </div>

                        {/* Trade Details */}
                        <div className="mt-8 space-y-3 bg-black/10 p-4 rounded-2xl border border-gray-800/50">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Slippage Tolerance</span>
                                <span className="text-[#00ff88] font-bold">0.5%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Price Impact</span>
                                <span className={`${priceImpact > 5 ? 'text-red-500' : priceImpact > 2 ? 'text-yellow-500' : 'text-[#00ff88]'} font-bold`}>
                                    {priceImpact > 0 ? `${priceImpact}%` : '< 0.01%'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraderDashboard;
