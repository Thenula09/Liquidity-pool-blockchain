import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import contractInfo from '../../contracts/contract-info.json';
import SimplePoolABI from '../../contracts/SimplePool.json';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [totalTHW, setTotalTHW] = useState(0);
  const [totalETH, setTotalETH] = useState(0);
  const [walletBalance, setWalletBalance] = useState({ eth: 0, thw: 0 });
  const [currentPrice, setCurrentPrice] = useState(0);
  const [poolContract, setPoolContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractOwner, setContractOwner] = useState(null);

  // Real-time chart data state
  const [chartData, setChartData] = useState([]);

  // Contract owner address
  const CONTRACT_OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  
  // Check if current user is owner
  const isOwner = account && account.toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase();
  
  // Debug logs
  console.log("Current Account:", account);
  console.log("Is Owner?:", isOwner);

  // Load contract owner
  const loadContractOwner = useCallback(async () => {
    if (!poolContract) return;
    
    try {
      const owner = await poolContract.owner();
      setContractOwner(owner);
      console.log("Contract owner:", owner);
      console.log("Contract owner (lowercase):", owner.toLowerCase());
      console.log("Connected account:", account);
      console.log("Connected account (lowercase):", account?.toLowerCase());
      console.log("Are they equal?", account?.toLowerCase() === owner.toLowerCase());
    } catch (error) {
      console.error("Error loading contract owner:", error);
    }
  }, [poolContract]);

  // Initialize contract
  useEffect(() => {
    console.log("Initializing contract...");
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log("MetaMask detected, initializing provider...");
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractInfo.poolAddress, SimplePoolABI, provider);
        setPoolContract(contract);
        console.log("Contract initialized successfully");
        
        // Load contract owner after contract is initialized
        setTimeout(() => {
          loadContractOwner();
        }, 100);
      } catch (error) {
        console.error("Error initializing contract:", error);
      }
    } else {
      console.log("MetaMask not detected");
    }
  }, []);

  // Check if already connected but don't auto-connect
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            console.log("Found existing connection:", accounts[0]);
            // Don't auto-connect, just log it
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };
    
    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length === 0) {
          // User disconnected all accounts
          setAccount(null);
          setWalletBalance({ eth: 0, thw: 0 });
          setTotalTHW(0);
          setTotalETH(0);
          setCurrentPrice(0);
          setLiquidityAmount('');
          console.log("All accounts disconnected");
        } else {
          // User switched to different account
          setAccount(accounts[0]);
          console.log("Switched to account:", accounts[0]);
          // Reload data for new account
          setTimeout(() => {
            if (poolContract) {
              loadPoolData();
              loadWalletBalance();
            }
          }, 100);
        }
      };

      const handleChainChanged = (chainId) => {
        console.log("Chain changed:", chainId);
        // Reload data when chain changes
        if (poolContract && account) {
          setTimeout(() => {
            loadPoolData();
            loadWalletBalance();
          }, 100);
        }
      };

      // Add event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup function
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [poolContract, account]);

  // Load pool data
  const loadPoolData = async () => {
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
  };

  // Load wallet balance
  const loadWalletBalance = async () => {
    if (!account || !window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Load ETH balance
      const ethBalance = await provider.getBalance(account);
      
      // Load THW token balance
      const tokenContract = new ethers.Contract(contractInfo.tokenAddress, [
        "function balanceOf(address owner) view returns (uint256)"
      ], provider);
      
      const thwBalance = await tokenContract.balanceOf(account);
      
      setWalletBalance({
        eth: ethers.formatEther(ethBalance),
        thw: ethers.formatUnits(thwBalance, 18)
      });
    } catch (error) {
      console.error("Error loading wallet balance:", error);
    }
  };

  // Load pool data - works even without account connection
  useEffect(() => {
    if (poolContract) {
      loadPoolData();
    }
  }, [poolContract]);

  // Load wallet balance - only when account is connected
  useEffect(() => {
    if (account && poolContract) {
      loadWalletBalance();
    }
  }, [account, poolContract]);

  // Real-time price fetching for chart
  useEffect(() => {
    const fetchPrice = async () => {
      if (poolContract) {
        try {
          // Pool එකේ තියෙන ETH සහ THW ප්‍රමාණයන් ලබා ගැනීම
          const ethReserves = await poolContract.totalEthInPool();
          const thwReserves = await poolContract.totalTokensInPool();

          const ethAmount = parseFloat(ethers.formatEther(ethReserves));
          const thwAmount = parseFloat(ethers.formatUnits(thwReserves, 18));

          // මිල ගණනය කිරීම: 1 THW = ? ETH
          // ආරම්භයේදී liquidity නැතිනම් මිල 0 ලෙස පෙන්වීමට
          let currentPrice = 0;
          if (thwAmount > 0) {
            currentPrice = ethAmount / thwAmount;
          }

          const newDataPoint = {
            time: new Date().toLocaleTimeString(),
            price: currentPrice.toFixed(6) // දශමස්ථාන 6කට පෙන්වමු
          };

          setChartData(prev => {
            // මිල වෙනස් වුණේ නැත්නම් chart එක එකම මට්ටමේ පවත්වා ගැනීමට
            return [...prev.slice(-19), newDataPoint]; // points 20ක් පෙන්වමු
          });
        } catch (err) {
          console.error("Price fetch error:", err);
        }
      }
    };

    const interval = setInterval(fetchPrice, 3000); // තත්පර 3න් 3ට update වේ
    return () => clearInterval(interval);
  }, [poolContract]);

  const connectWallet = async () => {
    console.log("Connect wallet button clicked");
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log("Requesting accounts...");
        
        // Request account access - this will show MetaMask popup
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Accounts received:", accounts);
        
        if (accounts && accounts.length > 0) {
          // Use the first account or let user select
          const selectedAccount = accounts[0];
          
          // Check if connected to the correct network
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          console.log("Current chainId:", chainId);
          
          // Hardhat network chainId is 0x7a69 (31337 in decimal)
          if (chainId !== '0x7a69') {
            console.log("Switching to Hardhat network...");
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a69' }],
              });
            } catch (switchError) {
              // This error code indicates that the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                console.log("Adding Hardhat network...");
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x7a69',
                      chainName: 'Hardhat Local',
                      rpcUrls: ['http://127.0.0.1:8545'],
                    },
                  ],
                });
              } else {
                throw switchError;
              }
            }
          }
          
          setAccount(selectedAccount);
          console.log("Wallet connected successfully to:", selectedAccount);
        } else {
          alert("No accounts found");
        }
      } else {
        console.log("MetaMask not available");
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        // User rejected the request
        alert("User rejected the connection request");
      } else {
        alert("Failed to connect wallet: " + (error.message || "Unknown error"));
      }
    }
  };

  const disconnectWallet = () => {
    console.log("Disconnecting wallet...");
    setAccount(null);
    setWalletBalance({ eth: 0, thw: 0 });
    // Keep pool data intact - don't reset these values
    // setTotalTHW(0);
    // setTotalETH(0);
    // setCurrentPrice(0);
    setLiquidityAmount('');
    console.log("Wallet disconnected");
  };

  const handleLogout = () => {
    // Disconnect wallet but keep pool data intact
    disconnectWallet();
    // Navigate to login page
    navigate('/');
  };

  const handleAddLiquidity = async () => {
    if (!liquidityAmount || !poolContract || !account) {
      alert("Please enter amount and connect wallet");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = poolContract.connect(signer);
      
      const tokensToAdd = ethers.parseUnits(liquidityAmount, 18);
      const ethToAdd = ethers.parseEther("0.1"); // 0.1 ETH
      
      // First, approve the contract to spend THW tokens
      const tokenContract = new ethers.Contract(contractInfo.tokenAddress, [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ], signer);
      
      console.log("Approving THW tokens...");
      const approveTx = await tokenContract.approve(contractInfo.poolAddress, tokensToAdd);
      await approveTx.wait();
      console.log("THW tokens approved");
      
      // Then add liquidity
      console.log("Adding liquidity...");
      const addLiquidityTx = await contractWithSigner.addLiquidity(tokensToAdd, {
        value: ethToAdd
      });

      await addLiquidityTx.wait();
      alert("Liquidity added successfully!");
      setLiquidityAmount('');
      loadPoolData();
      loadWalletBalance();
    } catch (error) {
      console.error("Error adding liquidity:", error);
      alert("Failed to add liquidity: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!poolContract || !account) {
      alert("Please connect wallet");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = poolContract.connect(signer);
      
      const tx = await contractWithSigner.removeLiquidity();
      await tx.wait();
      
      alert("Liquidity removed successfully!");
      loadPoolData();
      loadWalletBalance();
    } catch (error) {
      console.error("Error removing liquidity:", error);
      alert("Failed to remove liquidity: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Logout Button - Left Side */}
      <div style={{ position: 'fixed', left: '20px', top: '20px', zIndex: 1000 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#c82333';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#dc3545';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          🚪 Logout
        </button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>Owner Dashboard</h2>
        
        {/* Wallet Connection */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ color: '#555', marginBottom: '10px' }}>Wallet Connection</h3>
          {!account ? (
            <button 
              onClick={connectWallet}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div>
              <div style={{ color: '#28a745', marginBottom: '10px' }}>
                <strong>Connected:</strong> {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <button 
                onClick={disconnectWallet}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>

        {/* Total Wallet Balance */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#cce5ff', borderRadius: '8px' }}>
          <h3 style={{ color: '#004085', marginBottom: '15px' }}>Total Wallet Balance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
                {parseFloat(walletBalance.eth || 0).toFixed(4)}
              </div>
              <div style={{ color: '#666' }}>ETH Balance</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>
                {parseFloat(walletBalance.thw || 0).toLocaleString()}
              </div>
              <div style={{ color: '#666' }}>THW Balance</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#004085' }}>
            <strong>Total Value:</strong> {(parseFloat(walletBalance.eth || 0) + (parseFloat(walletBalance.thw || 0) * parseFloat(currentPrice || 0))).toFixed(4)} ETH
          </div>
        </div>

        {/* Total Liquidity Display */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
          <h3 style={{ color: '#155724', marginBottom: '15px' }}>Total Liquidity Pool</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                {parseFloat(totalTHW || 0).toLocaleString()}
              </div>
              <div style={{ color: '#666' }}>Total THW</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                {parseFloat(totalETH || 0).toFixed(4)}
              </div>
              <div style={{ color: '#666' }}>Total ETH</div>
            </div>
          </div>
        </div>

        {/* Liquidity Management Box */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#e2e3e5', borderRadius: '8px' }}>
          <h3 style={{ color: '#383d41', marginBottom: '15px' }}>Liquidity Management</h3>
          
          {isOwner ? (
            <>
              {/* Add Liquidity Section */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '6px' }}>
                <h4 style={{ color: '#28a745', marginBottom: '10px' }}>✅ Welcome Owner! You can manage liquidity here.</h4>
                <h4 style={{ color: '#495057', marginBottom: '10px', fontSize: '16px' }}>Add Liquidity</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="number"
                    placeholder="THW Amount"
                    value={liquidityAmount}
                    onChange={(e) => setLiquidityAmount(e.target.value)}
                    disabled={loading}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      flex: 1
                    }}
                  />
                  <button
                    onClick={handleAddLiquidity}
                    disabled={loading || !account}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: loading || !account ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading || !account ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Processing...' : 'Add'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Add THW tokens + 0.1 ETH to the pool
                </div>
              </div>

              {/* Remove Liquidity Section */}
              <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
                <h4 style={{ color: '#856404', marginBottom: '10px', fontSize: '16px' }}>Remove All Liquidity (Owner Only)</h4>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#856404' }}>⚠️ Warning:</strong> This will remove all liquidity from the pool and send it back to the owner's wallet.
                </div>
                <button
                  onClick={handleRemoveLiquidity}
                  disabled={loading || !account}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: loading || !account ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading || !account ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Processing...' : 'Add'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '15px', backgroundColor: '#f8d7da', borderRadius: '6px', border: '1px solid #f5c6cb' }}>
              <h4 style={{ color: '#721c24', margin: '0 0 10px 0', fontSize: '16px' }}>
                🔒 <strong>Owner Only Access</strong>
              </h4>
              <p style={{ color: '#721c24', margin: 0 }}>
                {account ? 'You are not the contract owner. Only the owner can manage liquidity.' : 'Please connect your wallet to continue.'}
              </p>
              {contractOwner && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                  Contract Owner: {contractOwner.slice(0, 6)}...{contractOwner.slice(-4)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time THW/ETH Price Chart */}
        <div className="bg-[#1a1a1a] p-6 rounded-2xl shadow-2xl mt-8 border border-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-white text-xl font-semibold">THW / ETH Price Chart</h2>
                <div className="text-[#00ff88] font-mono font-bold text-lg">
                    {chartData.length > 0 ? chartData[chartData.length - 1].price : "0.000000"} ETH
                </div>
            </div>
            
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                            dataKey="time" 
                            stroke="#888" 
                            fontSize={12} 
                            tickMargin={10}
                        />
                        <YAxis 
                            domain={['auto', 'auto']} // මිල අනුව graph එක auto scale වේ
                            stroke="#888" 
                            fontSize={12} 
                            tickFormatter={(val) => parseFloat(val).toFixed(4)}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#00ff88' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#00ff88" 
                            strokeWidth={3} 
                            dot={false} // Points පෙන්වන්නේ නැතිව line එක විතරක්
                            animationDuration={1000}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}
