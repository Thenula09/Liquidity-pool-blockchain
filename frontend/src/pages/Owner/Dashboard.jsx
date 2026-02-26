import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractInfo from '../../contracts/contract-info.json';
import SimplePoolABI from '../../contracts/SimplePool.json';

export default function OwnerDashboard() {
  const [account, setAccount] = useState(null);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [totalTHW, setTotalTHW] = useState(0);
  const [totalETH, setTotalETH] = useState(0);
  const [walletBalance, setWalletBalance] = useState({ eth: 0, thw: 0 });
  const [currentPrice, setCurrentPrice] = useState(0);
  const [poolContract, setPoolContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractOwner, setContractOwner] = useState(null);

  // Activity logging system
  const [activityLog, setActivityLog] = useState([]);

  // Add activity to log
  const addActivity = (type, description, data = {}) => {
    const newActivity = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      type: type, // 'connect', 'disconnect', 'add_liquidity', 'remove_liquidity'
      description: description,
      account: account,
      data: data
    };
    
    setActivityLog(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50 activities
    console.log(`📝 Activity Logged:`, newActivity);
  };

  // Update contract with read-only provider
  const updateContract = async () => {
    let provider;
    if (window.ethereum && account) {
      // Wallet connected - use Web3Provider with signer (Write access)
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      // Wallet disconnected - use JsonRpcProvider (Read access)
      provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    }
    
    if (contractInfo.poolAddress && SimplePoolABI.abi) {
      const poolContract = new ethers.Contract(contractInfo.poolAddress, SimplePoolABI.abi, provider);
      setPoolContract(poolContract);
      console.log("Contract updated with provider:", account ? "Web3Provider (Signer)" : "JsonRpcProvider (Read-only)");
    }
  };

  // Update contract when account changes
  useEffect(() => {
    updateContract();
  }, [account]);

  // Contract owner address
  const CONTRACT_OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  
  // Check if current user is owner
  const isOwner = account && account.toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase();
  
  // Debug logs
  console.log("Current Account:", account);
  console.log("Is Owner?:", isOwner);

  // Pool liquidity display
  const PoolLiquidityDisplay = () => (
    <div style={{ 
      padding: '15px', 
      backgroundColor: '#e8f4fd', 
      borderRadius: '8px', 
      marginBottom: '20px',
      border: '1px solid #bee5eb'
    }}>
      <h4 style={{ color: '#0c5460', marginBottom: '10px', fontSize: '16px' }}>
        💧 Current Pool Liquidity
      </h4>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#6c757d', fontSize: '12px' }}>ETH in Pool</div>
          <div style={{ color: '#0c5460', fontSize: '18px', fontWeight: 'bold' }}>
            {parseFloat(totalETH || 0).toFixed(4)} ETH
          </div>
        </div>
        <div>
          <div style={{ color: '#6c757d', fontSize: '12px' }}>THW in Pool</div>
          <div style={{ color: '#0c5460', fontSize: '18px', fontWeight: 'bold' }}>
            {parseFloat(totalTHW || 0).toFixed(2)} THW
          </div>
        </div>
        <div>
          <div style={{ color: '#6c757d', fontSize: '12px' }}>Current Price</div>
          <div style={{ color: '#0c5460', fontSize: '18px', fontWeight: 'bold' }}>
            1 THW = {parseFloat(currentPrice || 0).toFixed(6)} ETH
          </div>
        </div>
      </div>
    </div>
  );

  // Activity log display
  const ActivityLogDisplay = () => (
    <div style={{ 
      padding: '15px', 
      backgroundColor: '#fff3cd', 
      borderRadius: '8px', 
      marginBottom: '20px',
      border: '1px solid #ffeaa7',
      maxHeight: '300px',
      overflow: 'auto'
    }}>
      <h4 style={{ color: '#856404', marginBottom: '10px', fontSize: '16px' }}>
        📝 Activity Log
      </h4>
      {activityLog.length === 0 ? (
        <div style={{ color: '#6c757d', fontSize: '14px' }}>
          No activities yet. Connect your wallet to start.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activityLog.map((activity) => (
            <div 
              key={activity.id}
              style={{ 
                padding: '8px', 
                backgroundColor: '#fff', 
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: '#495057' }}>
                  {activity.type.toUpperCase()}
                </span>
                <span style={{ color: '#6c757d' }}>
                  {activity.timestamp}
                </span>
              </div>
              <div style={{ color: '#495057' }}>
                {activity.description}
              </div>
              {activity.account && (
                <div style={{ color: '#6c757d', fontSize: '11px' }}>
                  Account: {activity.account.slice(0, 6)}...{activity.account.slice(-4)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

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

  // Update data when account or contract changes
  useEffect(() => {
    if (poolContract) {
      loadPoolData(); // Load pool data even when disconnected (read-only)
      if (account) {
        loadWalletBalance(); // Load wallet balance only when connected
      }
    }
  }, [account, poolContract]);

  const connectWallet = async () => {
    console.log("Connect wallet button clicked");
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log("Requesting accounts...");
        
        // Request account access - this will show MetaMask popup
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Accounts received:", accounts);
        
        if (accounts && accounts.length > 0) {
          // Use first account or let user select
          const selectedAccount = accounts[0];
          
          // Log connection activity
          addActivity('connect', 'Wallet connected', {
            account: selectedAccount,
            network: 'Hardhat Localhost'
          });
          
          setAccount(selectedAccount);
          console.log("Wallet connected successfully");
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
    
    // Log disconnection activity
    addActivity('disconnect', 'Wallet disconnected', {
      previousAccount: account,
      ethBalance: walletBalance.eth,
      thwBalance: walletBalance.thw
    });
    
    setAccount(null);
    setWalletBalance({ eth: 0, thw: 0 });
    setLiquidityAmount('');
    console.log("Wallet disconnected");
  };

  const handleLogout = () => {
    console.log("🚪 Logging out from system...");
    
    // Log logout activity
    addActivity('logout', 'User logged out from system', {
      lastAccount: account
    });
    
    // Clear user-specific state only (NOT pool data - that stays live via read-only contract)
    setAccount(null);
    setWalletBalance({ eth: 0, thw: 0 });
    setLiquidityAmount('');
    
    // Note: We DON'T reset these because read-only contract keeps them updated:
    // - totalETH, totalTHW, currentPrice, chartData
    
    // Navigate to login page (you can adjust this based on your routing)
    window.location.href = "/";
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
      console.log("Liquidity added successfully!");

      // Log activity
      addActivity('add_liquidity', `Added ${liquidityAmount} THW + 0.1 ETH to pool`, {
        thwAmount: liquidityAmount,
        ethAmount: '0.1',
        transactionHash: addLiquidityTx.hash
      });

      // Refresh data
      await loadPoolData();
      await loadWalletBalance();
      
      alert("Liquidity added successfully!");
      setLiquidityAmount('');
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
      
      // Log activity
      addActivity('remove_liquidity', 'Removed all liquidity from pool', {
        transactionHash: tx.hash,
        previousEth: totalETH,
        previousThw: totalTHW
      });
      
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
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>Owner Dashboard</h2>
        
        {/* Wallet Connection */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ color: '#555', marginBottom: '10px' }}>Wallet Connection</h3>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {account ? (
              <>
                <div style={{ 
                  backgroundColor: '#d4edda', 
                  padding: '8px 12px', 
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#155724',
                  fontFamily: 'monospace'
                }}>
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </div>
                
                <button 
                  onClick={disconnectWallet}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ff8c00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#e07b00'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#ff8c00'}
                >
                  🔌 Disconnect Wallet
                </button>
                
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                  🚪 Logout System
                </button>
              </>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#0056b3')}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#007bff')}
              >
                {loading ? 'Connecting...' : '🔗 Connect MetaMask'}
              </button>
            )}
          </div>
          
          {!account && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
              💡 Pool data and price chart update live from blockchain (read-only mode)
            </div>
          )}
        </div>

        {/* Total Wallet Balance - Only show when connected */}
        {account && (
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
        )}

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
      </div>
    </div>
  );
}
