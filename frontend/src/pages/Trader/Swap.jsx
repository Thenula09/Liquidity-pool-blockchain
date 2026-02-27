import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CONTRACTS } from '../../constants/contracts.js';
import SimplePoolABI from '../../contracts/SimplePoolABI.json';
import THWTokenABI from '../../contracts/THWTokenABI.json';

// Debug: Verify ABIs are loaded correctly
console.log("🔍 SimplePool ABI Type:", typeof SimplePoolABI, "Is Array:", Array.isArray(SimplePoolABI), "Length:", SimplePoolABI?.length);
console.log("🔍 THW Token ABI Type:", typeof THWTokenABI, "Is Array:", Array.isArray(THWTokenABI), "Length:", THWTokenABI?.length);
console.log("🔍 Contract Addresses:", CONTRACTS);

// Check first item of each ABI
console.log("🔍 SimplePool ABI First Item:", SimplePoolABI?.[0]);
console.log("🔍 THW Token ABI First Item:", THWTokenABI?.[0]);

const TraderDashboard = () => {
    const [account, setAccount] = useState(null);
    const [poolContract, setPoolContract] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // User balances
    const [userETHBalance, setUserETHBalance] = useState('0.0000');
    const [userTHWBalance, setUserTHWBalance] = useState('0.0000');
    
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
    
    // Transaction history
    const [transactions, setTransactions] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Fetch transaction history
    const fetchTransactionHistory = useCallback(async () => {
        if (!account || !poolContract) return;
        
        try {
            console.log("🔄 Fetching transaction history...");
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Get transaction history for the current account
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
            
            // Filter for Swap events from our contract
            const swapFilter = {
                address: CONTRACTS.poolAddress,
                topics: [
                    ethers.id("Swap(address,uint256,uint256,uint256)"), // Correct event signature
                    null, // any user
                ],
                fromBlock: fromBlock,
                toBlock: 'latest'
            };
            
            const logs = await provider.getLogs(swapFilter);
            console.log("📊 Found logs:", logs.length);
            
            const userTransactions = logs.map(log => {
                try {
                    const parsed = poolContract.interface.parseLog(log);
                    const isUserTransaction = parsed.args.user.toLowerCase() === account.toLowerCase();
                    
                    if (isUserTransaction) {
                        const ethAmount = parseFloat(ethers.formatEther(parsed.args.ethAmount));
                        const thwAmount = parseFloat(ethers.formatUnits(parsed.args.tokenAmount, 18));
                        
                        // Determine transaction type based on ETH amount (positive = buy, negative = sell)
                        // Since this is a Swap event, we need to determine direction
                        // For now, let's assume all are buys (we can refine this later)
                        const type = 'BUY'; // We'll need to refine this logic
                        
                        return {
                            hash: log.transactionHash,
                            type: type,
                            ethAmount: ethAmount,
                            thwAmount: thwAmount,
                            timestamp: new Date(parsed.args.timestamp * 1000).toLocaleString(),
                            blockNumber: log.blockNumber
                        };
                    }
                    return null;
                } catch (parseError) {
                    console.error("Error parsing log:", parseError);
                    return null;
                }
            }).filter(tx => tx !== null);
            
            console.log("📈 User transactions:", userTransactions);
            setTransactions(userTransactions.reverse()); // Most recent first
        } catch (error) {
            console.error("❌ Error fetching transaction history:", error);
        }
    }, [account, poolContract]);

    // Add transaction to history
    const addTransactionToHistory = (type, ethAmount, thwAmount, txHash) => {
        const newTransaction = {
            hash: txHash,
            type: type,
            ethAmount: ethAmount,
            thwAmount: thwAmount,
            timestamp: new Date().toLocaleString(),
            blockNumber: 'pending'
        };
        
        setTransactions(prev => [newTransaction, ...prev]);
    };

    // THW gana enter karana kota ETH gana calculate karana function eka (CPMM Formula)
    const handleTHWChange = (e) => {
        const thwAmount = parseFloat(e.target.value) || 0;
        setThwReceive(e.target.value);

        const poolETH = parseFloat(totalETH) || 0;
        const poolTHW = parseFloat(totalTHW) || 0;

        if (thwAmount > 0 && poolTHW > 0 && poolTHW > thwAmount) {
            // CPMM Formula for Buy (ETH -> THW): ETH_needed = (ETH_pool * THW_out) / (THW_pool - THW_out)
            const ethNeeded = (poolETH * thwAmount) / (poolTHW - thwAmount);
            
            // Calculate price impact
            const currentPrice = poolETH / poolTHW;
            const newPrice = (poolETH + ethNeeded) / (poolTHW - thwAmount);
            const impact = ((newPrice - currentPrice) / currentPrice) * 100;
            
            setEthPay(ethNeeded.toFixed(6));
            setPriceImpact(Math.abs(impact).toFixed(2));
        } else {
            setEthPay('0');
            setPriceImpact(0);
        }
    };

    // Generate initial chart data
    const generateInitialData = () => {
        const initialData = [];
        const basePrice = 0.000668;
        
        for (let i = 10; i >= 0; i--) {
            const time = new Date(Date.now() - i * 3000).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            const price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
            initialData.push({ time, price });
        }
        
        setChartData(initialData);
    };

    // Load pool data
    const loadPoolData = useCallback(async () => {
        if (!poolContract) return;
        
        try {
            console.log("🔄 Loading pool data...");
            
            // Use the new CPMM getReserves function
            const [ethReserves, tokenReserves] = await poolContract.getReserves();
            const price = await poolContract.getPrice();
            
            console.log("📊 Pool Data Loaded:", {
                ethReserves: ethers.formatEther(ethReserves),
                tokenReserves: ethers.formatUnits(tokenReserves, 18),
                price: ethers.formatUnits(price, 18)
            });
            
            setTotalETH(ethers.formatEther(ethReserves));
            setTotalTHW(ethers.formatUnits(tokenReserves, 18));
            setCurrentPrice(ethers.formatUnits(price, 18));
        } catch (error) {
            console.error("❌ Error loading pool data:", error);
            // Don't throw error, just log it for now
        }
    }, [poolContract]);

    // Initialize contract
    useEffect(() => {
        const initContract = async () => {
            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    console.log("🚀 Step 2: Starting contract setup...");
                    
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    console.log("✅ Step 2a: Provider created successfully");
                    
                    // Check if ABI is correct
                    console.log("📊 Step 2b: SimplePool ABI Data Check:", {
                        type: typeof SimplePoolABI,
                        isArray: Array.isArray(SimplePoolABI),
                        length: SimplePoolABI?.length,
                        firstItem: SimplePoolABI?.[0]
                    });
                    
                    if (!SimplePoolABI || !Array.isArray(SimplePoolABI)) {
                        console.error("❌ Step 2c: SimplePool ABI is not an Array! (Check your import)");
                        return;
                    }
                    
                    console.log("🔍 Step 2d: Using contract address:", CONTRACTS.poolAddress);
                    const contract = new ethers.Contract(CONTRACTS.poolAddress, SimplePoolABI, provider);
                    setPoolContract(contract);
                    console.log("✅ Step 2e: Contract initialized successfully at:", CONTRACTS.poolAddress);
                    
                    // Load pool data immediately
                    loadPoolData();
                    
                } catch (error) {
                    console.error("❌ Step 2f: Error initializing contract:", error);
                    console.error("❌ Step 2g: Error details:", error.message, error.code, error.reason);
                }
            } else {
                console.error("❌ Step 2h: MetaMask not found");
            }
        };

        initContract();
    }, []); // Remove dependency to prevent infinite loop

    // Load transaction history when account changes
    useEffect(() => {
        if (account && poolContract) {
            fetchTransactionHistory();
        }
    }, [account, poolContract]); // Remove fetchTransactionHistory dependency to prevent infinite loop

    // Load initial data when contract is set
    useEffect(() => {
        if (poolContract) {
            loadPoolData();
        }
    }, [poolContract]); // Remove loadPoolData dependency to prevent infinite loop

    // Update UI after transaction
    const updateUI = async () => {
        try {
            await loadPoolData();
            await updateUserBalances(account);
            // Refresh transaction history after a short delay to allow the event to be processed
            setTimeout(() => {
                fetchTransactionHistory();
            }, 2000);
        } catch (error) {
            console.error("Error updating UI:", error);
        }
    };

    // Real-time price fetching for chart
    useEffect(() => {
        const fetchPrice = async () => {
            if (poolContract) {
                try {
                    // Use the new CPMM getReserves function
                    const [ethReserves, tokenReserves] = await poolContract.getReserves();

                    const ethAmount = parseFloat(ethers.formatEther(ethReserves));
                    const thwAmount = parseFloat(ethers.formatUnits(tokenReserves, 18));

                    // Calculate price: 1 THW = ? ETH
                    let currentPrice = 0;
                    if (thwAmount > 0) {
                        currentPrice = ethAmount / thwAmount;
                    }

                    setCurrentPrice(currentPrice.toString());

                    // Chart data update
                    setChartData(prevData => {
                        const newPoint = {
                            time: new Date().toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                            }),
                            price: currentPrice
                        };

                        const updatedData = [...prevData, newPoint];
                        return updatedData.slice(-20); // Keep last 20 points
                    });
                } catch (error) {
                    console.error("Error fetching price:", error);
                }
            }
        };

        if (poolContract) {
            generateInitialData();
            fetchPrice();
            const interval = setInterval(fetchPrice, 3000);
            return () => clearInterval(interval);
        }
    }, [poolContract]);

    // Cleanup balance interval on unmount
    useEffect(() => {
        return () => {
            if (window.balanceInterval) {
                clearInterval(window.balanceInterval);
            }
        };
    }, []);

    // Update user balances
    const updateUserBalances = useCallback(async (userAddress) => {
        if (!userAddress || !window.ethereum) return;
        
        console.log("🚀 updateUserBalances called for address:", userAddress);
        
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            console.log("✅ Provider created successfully");
            
            // Get ETH balance
            const ethBalance = await provider.getBalance(userAddress);
            console.log("💰 Raw ETH Balance:", ethBalance.toString());
            console.log("💰 Formatted ETH Balance:", ethers.formatEther(ethBalance));
            setUserETHBalance(parseFloat(ethers.formatEther(ethBalance)).toFixed(4));
            
            // Get THW token balance
            console.log("🔍 Creating THW Token Contract with address:", CONTRACTS.tokenAddress);
            const tokenContract = new ethers.Contract(CONTRACTS.tokenAddress, THWTokenABI, provider);
            console.log("✅ THW Token Contract created successfully");
            
            console.log("🔍 Calling balanceOf for address:", userAddress);
            const thwBalance = await tokenContract.balanceOf(userAddress);
            console.log("💰 Raw THW Balance:", thwBalance.toString());
            console.log("💰 Formatted THW Balance:", ethers.formatUnits(thwBalance, 18));
            setUserTHWBalance(parseFloat(ethers.formatUnits(thwBalance, 18)).toFixed(4));
            
            console.log("💰 Balances Updated:", {
                ETH: ethers.formatEther(ethBalance),
                THW: ethers.formatUnits(thwBalance, 18)
            });
        } catch (error) {
            console.error("❌ Error updating balances:", error);
            console.error("❌ Error details:", error.message, error.code, error.reason);
        }
    }, []);

    // Connect wallet
    const connectWallet = async () => {
        try {
            if (typeof window !== 'undefined' && window.ethereum) {
                console.log("🚀 Step 1: Attempting to connect wallet...");
                
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const provider = new ethers.BrowserProvider(window.ethereum);
                
                console.log("✅ Step 1a: Wallet connected -", accounts[0]);
                
                // Test balance retrieval for connected account
                try {
                    const balance = await provider.getBalance(accounts[0]);
                    console.log("✅ Step 1b: User Balance - Raw:", balance.toString());
                    console.log("✅ Step 1c: User Balance - Formatted:", ethers.formatEther(balance), "ETH");
                } catch (balanceError) {
                    console.error("❌ Step 1d: User balance test failed:", balanceError);
                }
                
                setAccount(accounts[0]);
                
                // Update balances immediately
                updateUserBalances(accounts[0]);
                
                // Set up balance update interval
                const balanceInterval = setInterval(() => {
                    updateUserBalances(accounts[0]);
                }, 5000); // Update every 5 seconds
                
                // Store interval ID for cleanup
                window.balanceInterval = balanceInterval;
                
                console.log("✅ Step 1e: Balance updates started (every 5 seconds)");
            } else {
                console.error("❌ Step 1f: MetaMask not found!");
                alert("Please install MetaMask!");
            }
        } catch (error) {
            console.error("❌ Step 1g: Error connecting wallet:", error);
            alert("Failed to connect wallet");
        }
    };

    // --- 1. Buy THW (Send ETH to get THW tokens) - CPMM ---
    const handleBuy = async () => {
        if (!thwReceive || isNaN(thwReceive)) return alert("Please enter a valid THW amount");
        if (!account || !poolContract) return alert("Please connect wallet first");

        setLoading(true);
        try {
            console.log("🔄 Starting buy transaction...");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = poolContract.connect(signer);

            const ethAmountWei = ethers.parseEther(ethPay);
            console.log("💰 ETH amount to send:", ethPay, "ETH");

            console.log("📞 Calling buyTokens function...");
            // Using the new CPMM function: buyTokens()
            const tx = await contract.buyTokens({ value: ethAmountWei });
            
            console.log("⏳ Waiting for transaction confirmation...");
            await tx.wait();
            
            console.log("✅ Transaction confirmed:", tx.hash);
            
            // Add to transaction history
            addTransactionToHistory('BUY', parseFloat(ethPay), parseFloat(thwReceive), tx.hash);
            
            alert("Buy Successful! THW tokens added to your wallet.");
            setThwReceive("");
            setEthPay("");
            setPriceImpact(0);
            
            // Update data after successful transaction
            await updateUI();
            
        } catch (err) {
            console.error("❌ Buy Error:", err);
            alert("Transaction Failed: " + (err.message || err.reason || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Sell THW (Send THW tokens to get ETH) - CPMM ---
    const handleSell = async () => {
        if (!thwReceive || isNaN(thwReceive)) return alert("Please enter a valid THW amount");
        if (!account || !poolContract) return alert("Please connect wallet first");

        setLoading(true);
        try {
            console.log("🔄 Starting sell transaction...");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Step A: Approve THW tokens for the contract
            console.log("🔐 Creating token contract...");
            const tokenContract = new ethers.Contract(CONTRACTS.tokenAddress, THWTokenABI, signer);
            const thwAmountWei = ethers.parseUnits(thwReceive, 18);
            console.log("💰 THW amount to approve:", thwReceive, "THW");

            console.log("📞 Approving THW tokens for sale...");
            const approveTx = await tokenContract.approve(CONTRACTS.poolAddress, thwAmountWei);
            await approveTx.wait();
            console.log("✅ Approval confirmed:", approveTx.hash);

            // Step B: Call the CPMM sell function
            console.log("📞 Calling sellTokens function...");
            const mainContract = poolContract.connect(signer);
            const tx = await mainContract.sellTokens(thwAmountWei);
            
            console.log("⏳ Waiting for transaction confirmation...");
            await tx.wait();
            console.log("✅ Transaction confirmed:", tx.hash);
            
            // Add to transaction history
            addTransactionToHistory('SELL', parseFloat(ethPay), parseFloat(thwReceive), tx.hash);
            
            alert("Sell Successful! ETH sent to your wallet.");
            setThwReceive("");
            setEthPay("");
            setPriceImpact(0);
            
            // Update data after successful transaction
            await updateUI();
            
        } catch (err) {
            console.error("❌ Sell Error:", err);
            alert("Transaction Failed: " + (err.message || err.reason || "Unknown error"));
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
        <div className="min-h-screen w-screen bg-[#1a1b1e] text-white font-sans overflow-hidden">
            <div className="h-screen w-full flex flex-col">
                
                {/* Header - Wallet Connection */}
                <div className="flex justify-between items-center bg-[#25262b] p-3 lg:p-4 border border-[#3a3d45]">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-3 h-3 bg-[#00ff88] rounded-full animate-pulse"></span>
                        Thenula Trader Terminal
                    </h1>
                    {!account ? (
                        <button onClick={connectWallet} disabled={loading} className="bg-[#00ff88] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#00e67a] transition-all disabled:opacity-50">
                            {loading ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Your Balances</p>
                                <div className="flex gap-3">
                                    <span className="text-sm font-bold text-white">{userETHBalance} ETH</span>
                                    <span className="text-sm font-bold text-[#00ff88]">{userTHWBalance} THW</span>
                                </div>
                            </div>
                            <div className="text-sm font-mono text-gray-400 bg-black/30 px-4 py-2 rounded-xl border border-[#3a3d45]">
                                {account.slice(0,6)}...{account.slice(-4)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-4 p-4 lg:p-6 overflow-hidden">
                    
                    {/* Left: Live Market Chart */}
                    <div className="xl:col-span-3 h-full">
                        <div className="bg-[#25262b] p-4 lg:p-6 rounded-3xl border border-[#3a3d45] shadow-2xl h-full flex flex-col">
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
                            <div className="flex-1 w-full min-w-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="traderColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#3a3d45" vertical={false} opacity={0.4} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#2c2f38', border: '1px solid #3a3d45', borderRadius: '12px'}}
                                            itemStyle={{color: '#00ff88'}}
                                        />
                                        <Area type="monotone" dataKey="price" stroke="#00ff88" fill="url(#traderColor)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right: Swap/Trading Box */}
                    <div className="xl:col-span-2 bg-[#25262b] p-4 lg:p-6 rounded-3xl border border-[#3a3d45] shadow-2xl h-full flex flex-col">
                        <div className="flex bg-black/30 p-1.5 rounded-2xl mb-6">
                            <button 
                                onClick={() => setSwapMode('buy')}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${swapMode === 'buy' ? 'bg-[#2c2f38] text-[#00ff88] shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                            > Buy </button>
                            <button 
                                onClick={() => setSwapMode('sell')}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${swapMode === 'sell' ? 'bg-[#2c2f38] text-red-500 shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                            > Sell </button>
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="bg-black/20 p-4 rounded-2xl border border-[#3a3d45]">
                                    <label className="text-xs text-gray-400 font-bold mb-2 block uppercase">You Receive (THW)</label>
                                    <div className="flex items-center">
                                        <input 
                                            type="number"
                                            value={thwReceive}
                                            onChange={handleTHWChange}
                                            placeholder="0.0"
                                            disabled={loading || !account}
                                            className="bg-transparent text-2xl font-bold w-full focus:outline-none placeholder:text-gray-500 disabled:opacity-50"
                                        />
                                        <span className="text-lg font-bold text-gray-300">THW</span>
                                    </div>
                                    {parseFloat(thwReceive) > 0 && parseFloat(totalTHW) > 0 && parseFloat(thwReceive) > parseFloat(totalTHW) && (
                                        <p className="text-red-500 text-xs mt-2">Not enough liquidity in pool</p>
                                    )}
                                </div>

                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="bg-[#2c2f38] p-2 rounded-full border border-[#3a3d45] text-[#00ff88]">
                                        ↓
                                    </div>
                                </div>

                                <div className="bg-black/20 p-4 rounded-2xl border border-[#3a3d45]">
                                    <label className="text-xs text-gray-400 font-bold mb-2 block uppercase">You Pay (ETH)</label>
                                    <div className="flex items-center">
                                        <p className="text-2xl font-bold w-full text-white">
                                            {ethPay || "0.00"}
                                        </p>
                                        <span className="text-lg font-bold text-gray-300">ETH</span>
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
                            <div className="space-y-3 bg-black/15 p-4 rounded-2xl border border-[#3a3d45]/50 mt-4">
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

                            {/* Transaction History */}
                            <div className="mt-4">
                                <button 
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="w-full bg-black/20 p-3 rounded-2xl border border-[#3a3d45] text-left flex justify-between items-center hover:bg-black/30 transition-all"
                                >
                                    <span className="text-sm font-bold text-gray-300">Transaction History</span>
                                    <span className="text-xs text-gray-500">{showHistory ? '▼' : '▶'} {transactions.length} transactions</span>
                                </button>
                                
                                {showHistory && (
                                    <div className="mt-2 bg-black/20 rounded-2xl border border-[#3a3d45] max-h-48 overflow-y-auto">
                                        {transactions.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400 text-sm">
                                                No transactions yet
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-[#3a3d45]">
                                                {transactions.map((tx, index) => (
                                                    <div key={index} className="p-3 hover:bg-black/30 transition-all">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                                        tx.type === 'BUY' 
                                                                        ? 'bg-[#00ff88]/20 text-[#00ff88]' 
                                                                        : 'bg-red-500/20 text-red-500'
                                                                    }`}>
                                                                        {tx.type}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {tx.timestamp}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm">
                                                                    <span className="text-white font-medium">
                                                                        {tx.ethAmount.toFixed(6)} ETH
                                                                    </span>
                                                                    <span className="text-gray-400 mx-2">↔</span>
                                                                    <span className="text-[#00ff88] font-medium">
                                                                        {tx.thwAmount.toFixed(2)} THW
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-400 font-mono">
                                                                {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraderDashboard;
