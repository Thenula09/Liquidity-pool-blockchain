import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CONTRACTS } from '../../constants/contracts.js';
import SimplePoolABI from '../../contracts/SimplePoolABI.json';
import THWTokenABI from '../../contracts/THWTokenABI.json';

// Debug: Verify ABIs are loaded correctly
console.log("🔍 Owner Dashboard - SimplePool ABI Type:", typeof SimplePoolABI, "Is Array:", Array.isArray(SimplePoolABI), "Length:", SimplePoolABI?.length);
console.log("🔍 Owner Dashboard - THW Token ABI Type:", typeof THWTokenABI, "Is Array:", Array.isArray(THWTokenABI), "Length:", THWTokenABI?.length);
console.log("🔍 Owner Dashboard - Contract Addresses:", CONTRACTS);

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [addEth, setAddEth] = useState("");
  const [addThw, setAddThw] = useState("");
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
        const contract = new ethers.Contract(CONTRACTS.poolAddress, SimplePoolABI, provider);
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
  const loadPoolData = useCallback(async () => {
    if (!poolContract) return;
    
    try {
      console.log("🔍 Loading pool data...");
      
      // Use the correct getReserves() function from the contract
      const [ethReserve, tokenReserve] = await poolContract.getReserves();
      const price = await poolContract.getPrice();
      
      console.log("💰 Pool Reserves:", {
        eth: ethers.formatEther(ethReserve),
        thw: ethers.formatUnits(tokenReserve, 18),
        price: ethers.formatUnits(price, 18)
      });
      
      setTotalETH(ethers.formatEther(ethReserve));
      setTotalTHW(ethers.formatUnits(tokenReserve, 18));
      setCurrentPrice(ethers.formatUnits(price, 18));
      
      console.log("✅ Pool data loaded successfully!");
    } catch (error) {
      console.error("❌ Error loading pool data:", error);
      console.error("❌ Error details:", error.message, error.code, error.reason);
    }
  }, [poolContract]);

  // Load wallet balance
  const loadWalletBalance = useCallback(async () => {
    if (!account || !window.ethereum) return;
    
    try {
      console.log("🔄 Loading wallet balance for account:", account);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Load ETH balance
      const ethBalance = await provider.getBalance(account);
      const formattedETH = ethers.formatEther(ethBalance);
      console.log("💰 Raw ETH Balance:", ethBalance.toString());
      console.log("💰 Formatted ETH Balance:", formattedETH);
      
      // Load THW token balance
      const tokenContract = new ethers.Contract(CONTRACTS.tokenAddress, THWTokenABI, provider);
      const thwBalance = await tokenContract.balanceOf(account);
      const formattedTHW = ethers.formatUnits(thwBalance, 18);
      console.log("💰 Raw THW Balance:", thwBalance.toString());
      console.log("💰 Formatted THW Balance:", formattedTHW);
      
      const newWalletBalance = {
        eth: formattedETH,
        thw: formattedTHW
      };
      
      console.log("🔄 Updating wallet balance state:", newWalletBalance);
      setWalletBalance(newWalletBalance);
      console.log("✅ Wallet balance updated successfully!");
    } catch (error) {
      console.error("❌ Error loading wallet balance:", error);
      console.error("❌ Error details:", error.message, error.code, error.reason);
    }
  }, [account]);

  // Expected price calculation for preview
  const expectedPrice = useMemo(() => {
    const ethToAdd = parseFloat(addEth) || 0;
    const thwToAdd = parseFloat(addThw) || 0;

    // Add to current pool amounts
    const totalNewEth = parseFloat(totalETH) + ethToAdd;
    const totalNewThw = parseFloat(totalTHW) + thwToAdd;

    // Better price calculation with division by zero protection
    if (totalNewThw > 0) {
      const price = totalNewEth / totalNewThw;
      return price.toFixed(8); // 8 decimal places for precision
    }
    return "0.00000000";
  }, [addEth, addThw, totalETH, totalTHW]);

  // Load pool data - works even without account connection
  useEffect(() => {
    if (poolContract) {
      loadPoolData();
    }
  }, [poolContract]); // Remove loadPoolData from dependencies

  // Load wallet balance - only when account is connected
  useEffect(() => {
    if (account && poolContract) {
      loadWalletBalance();
    }
  }, [account, poolContract]);

  // Automatic balance updates every 10 seconds
  useEffect(() => {
    if (!account) return;
    
    console.log("🔄 Setting up automatic balance updates every 10 seconds...");
    const interval = setInterval(() => {
      console.log("⏰ Auto-refreshing balances...");
      loadWalletBalance();
      loadPoolData();
    }, 10000); // 10 seconds
    
    return () => {
      console.log("🛑 Clearing balance update interval");
      clearInterval(interval);
    };
  }, [account]);

  // Real-time price fetching for chart
  useEffect(() => {
    const fetchPrice = async () => {
      if (poolContract) {
        try {
          // Pool එකේ තියෙන ETH සහ THW ප්‍රමාණයන් ලබා ගැනීම
          const [ethReserves, thwReserves] = await poolContract.getReserves();

          const ethAmount = parseFloat(ethers.formatEther(ethReserves));
          const thwAmount = parseFloat(ethers.formatUnits(thwReserves, 18));

          // මිල ගණනය කිරීම: 1 THW = ? ETH
          // ආරම්භයේදී liquidity නැතිනම් මිල 0 ලෙස පෙන්වීමට
          let currentPrice = 0;
          if (thwAmount > 0 && ethAmount > 0) {
            currentPrice = ethAmount / thwAmount;
            console.log("📊 Calculated Current Price:", currentPrice.toFixed(8));
          } else {
            console.log("📊 No liquidity - Price set to 0");
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

    console.log("🚀 handleAddLiquidity called with amount:", liquidityAmount);
    console.log("🔍 Account:", account);
    console.log("🔍 Pool Contract:", poolContract);

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log("✅ Provider created successfully");
      
      const signer = await provider.getSigner();
      console.log("✅ Signer created successfully:", signer.address);
      
      const contractWithSigner = poolContract.connect(signer);
      console.log("✅ Contract connected to signer");
      
      // Fixed Amount: Use user input directly (no limits)
      const tokensToAdd = ethers.parseUnits(liquidityAmount, 18);
      const ethToAdd = ethers.parseEther("0.1"); // Fixed 0.1 ETH for simple mode
      
      console.log("💰 Amounts to add:", {
        tokens: tokensToAdd.toString(),
        eth: ethToAdd.toString(),
        userRequested: liquidityAmount
      });
      
      // First, check THW token balance
      console.log("🔍 Checking THW token balance...");
      const tokenContract = new ethers.Contract(CONTRACTS.tokenAddress, THWTokenABI, signer);
      const userBalance = await tokenContract.balanceOf(account);
      console.log("💰 User THW Balance:", userBalance.toString());
      
      if (userBalance < tokensToAdd) {
        alert(`Insufficient THW tokens! You have ${ethers.formatUnits(userBalance, 18)} THW, but trying to add ${liquidityAmount} THW`);
        return;
      }
      
      // Check current allowance
      console.log("🔍 Checking current allowance...");
      const currentAllowance = await tokenContract.allowance(account, CONTRACTS.poolAddress);
      console.log("💰 Current Allowance:", currentAllowance.toString());
      
      // Only approve if needed
      if (currentAllowance < tokensToAdd) {
        console.log("🔍 Approving THW tokens...");
        const approveTx = await tokenContract.approve(CONTRACTS.poolAddress, tokensToAdd);
        console.log("📝 Approval transaction sent:", approveTx.hash);
        await approveTx.wait();
        console.log("✅ THW tokens approved");
      } else {
        console.log("✅ Sufficient allowance already exists");
      }
      
      // Then add liquidity
      console.log("🔍 Adding liquidity to pool...");
      console.log("🔍 Contract Address:", CONTRACTS.poolAddress);
      console.log("🔍 Function Call: addLiquidity(uint256 _tokenAmount)");
      console.log("🔍 Parameters:", tokensToAdd.toString());
      console.log("🔍 ETH Value:", ethToAdd.toString());
      
      // Contract function: addLiquidity(uint256 _tokenAmount) public payable
      const addLiquidityTx = await contractWithSigner.addLiquidity(tokensToAdd, {
        value: ethToAdd,
        gasLimit: 300000
      });
      console.log("📝 Liquidity transaction sent:", addLiquidityTx.hash);

      const receipt = await addLiquidityTx.wait();
      console.log("✅ Liquidity added successfully!");
      console.log("📊 Transaction Receipt:", receipt);
      
      // ✅ Immediately refresh both pool data and wallet balances
      console.log("🔄 Refreshing data after successful transaction...");
      await loadPoolData();
      await loadWalletBalance();
      console.log("✅ Data refresh completed!");
      
      alert(`Liquidity added successfully! Added ${liquidityAmount} THW and 0.1 ETH`);
      setLiquidityAmount('');
    } catch (error) {
      console.error("❌ Error adding liquidity:", error);
      console.error("❌ Error details:", error.message, error.code, error.reason);
      
      // Try to extract revert reason if available
      if (error.data) {
        console.error("❌ Error data:", error.data);
        try {
          // Try to decode the revert reason using poolContract
          const decodedError = poolContract.interface.parseError(error.data);
          console.error("❌ Decoded error:", decodedError);
        } catch (decodeError) {
          console.error("❌ Could not decode error:", decodeError);
        }
      }
      
      // Check specific error types
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        alert("Transaction failed due to gas estimation. Please try a smaller amount.");
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        alert("Insufficient ETH for gas fees.");
      } else {
        alert("Failed to add liquidity: " + (error.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  // New dual input liquidity function
  const handleAddLiquidityWithPrice = async () => {
    if (!addEth || !addThw) {
      alert("Please fill both inputs!");
      return;
    }

    if (!poolContract || !account) {
      alert("Please connect wallet first!");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = poolContract.connect(signer);

      // ETH සහ THW අගයන් Blockchain එකට ගැළපෙන විදිහට (Wei) හරවමු
      const ethInWei = ethers.parseEther(addEth);
      const thwInWei = ethers.parseUnits(addThw, 18);

      console.log(`Adding ${addEth} ETH and ${addThw} THW to pool...`);

      // First, approve THW tokens
      const tokenContract = new ethers.Contract(CONTRACTS.tokenAddress, THWTokenABI, signer);
      
      console.log("Approving THW tokens...");
      const approveTx = await tokenContract.approve(CONTRACTS.poolAddress, thwInWei);
      await approveTx.wait();
      console.log("THW tokens approved");

      // Contract එකේ function එක call කිරීම
      // Contract function: addLiquidity(uint256 _tokenAmount) public payable
      const tx = await contractWithSigner.addLiquidity(thwInWei, { 
        value: ethInWei,
        gasLimit: 300000
      });
      
      await tx.wait(); // Transaction එක confirm වන තෙක් ඉමු
      
      alert("Liquidity Added Successfully! Price updated.");
      setAddEth(""); // Inputs clear කරමු
      setAddThw("");

      // වැදගත්ම දේ: Transaction එක ඉවර වුණ ගමන් අලුත් මිල Chart එකට ගන්න
      loadPoolData(); 

    } catch (err) {
      console.error("Liquidity Error:", err);
      alert("Transaction Failed: " + (err.message || "Unknown error"));
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
    <div style={{ 
      padding: '0', 
      margin: '0',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        pointerEvents: 'none'
      }} />

      {/* Logout Button - Floating */}
      <div style={{ position: 'fixed', right: '30px', top: '30px', zIndex: 1000 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Main Container */}
      <div style={{ 
        maxWidth: '1600px', 
        margin: '0 auto', 
        padding: '15px',
        width: '100%',
        minHeight: '100vh'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            color: 'white', 
            fontSize: '36px', 
            fontWeight: '800', 
            marginBottom: '5px',
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)'
          }}>
            Owner Dashboard
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', margin: 0 }}>
            Liquidity Pool Management System
          </p>
        </div>

        {/* Wallet Connection Card */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '16px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#1a202c', marginBottom: '8px', fontSize: '20px', fontWeight: '700' }}>
                🔗 Wallet Connection
              </h3>
              {!account ? (
                <p style={{ color: '#718096', margin: 0 }}>Connect your wallet to manage liquidity</p>
              ) : (
                <div>
                  <p style={{ color: '#48bb78', margin: 0, fontWeight: '600' }}>
                    ✅ Connected: {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
              )}
            </div>
            {!account ? (
              <button 
                onClick={connectWallet}
                disabled={loading}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
                }}
              >
                {loading ? '⏳ Connecting...' : '🔌 Connect Wallet'}
              </button>
            ) : (
              <button 
                onClick={disconnectWallet}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #f56565 0%, #ed8936 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 8px 25px rgba(245, 101, 101, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(245, 101, 101, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(245, 101, 101, 0.3)';
                }}
              >
                🔌 Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginBottom: '30px' }}>
          
          {/* Wallet Balance Card */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(20px)',
            borderRadius: '20px', 
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
              borderRadius: '0 20px 0 50%',
              opacity: 0.1
            }} />
            <h3 style={{ color: '#1a202c', marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>
              💰 Wallet Balance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: '#4299e1',
                  marginBottom: '5px'
                }}>
                  {parseFloat(walletBalance.eth || 0).toFixed(4)}
                </div>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: '500' }}>ETH</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: '#ed8936',
                  marginBottom: '5px'
                }}>
                  {parseFloat(walletBalance.thw || 0).toLocaleString()}
                </div>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: '500' }}>THW</div>
              </div>
            </div>
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#4a5568', fontSize: '14px', marginBottom: '5px' }}>Total Value</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                color: '#2d3748'
              }}>
                {(parseFloat(walletBalance.eth || 0) + (parseFloat(walletBalance.thw || 0) * parseFloat(currentPrice || 0))).toFixed(4)} ETH
              </div>
            </div>
          </div>

          {/* Pool Liquidity Card */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(20px)',
            borderRadius: '20px', 
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              borderRadius: '0 20px 0 50%',
              opacity: 0.1
            }} />
            <h3 style={{ color: '#1a202c', marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>
              🏊 Pool Liquidity
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: '#48bb78',
                  marginBottom: '5px'
                }}>
                  {parseFloat(totalTHW || 0).toLocaleString()}
                </div>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: '500' }}>THW</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: '#805ad5',
                  marginBottom: '5px'
                }}>
                  {parseFloat(totalETH || 0).toFixed(4)}
                </div>
                <div style={{ color: '#718096', fontSize: '14px', fontWeight: '500' }}>ETH</div>
              </div>
            </div>
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#4a5568', fontSize: '14px', marginBottom: '5px' }}>Current Price</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                color: '#2d3748'
              }}>
                1 THW = {currentPrice || "0.000000"} ETH
              </div>
            </div>
          </div>
        </div>

        {/* Liquidity Management Section */}
        {isOwner && account && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(20px)',
            borderRadius: '20px', 
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ color: '#1a202c', fontSize: '28px', fontWeight: '800', marginBottom: '10px' }}>
                🎯 Liquidity Management
              </h2>
              <p style={{ color: '#718096', fontSize: '16px' }}>Add or remove liquidity from the pool</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
              
              {/* Fixed Amount Liquidity */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                borderRadius: '16px', 
                padding: '30px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ color: '#2d3748', marginBottom: '15px', fontSize: '18px', fontWeight: '700' }}>
                  ⚡ Quick Add (Fixed 0.1 ETH)
                </h3>
                <p style={{ color: '#718096', fontSize: '14px', marginBottom: '20px' }}>
                  Add THW tokens with fixed 0.1 ETH
                </p>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
                  <input
                    type="number"
                    placeholder="THW Amount"
                    value={liquidityAmount}
                    onChange={(e) => setLiquidityAmount(e.target.value)}
                    disabled={loading}
                    style={{
                      padding: '14px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      flex: 1,
                      fontSize: '16px',
                      background: 'white',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    onClick={handleAddLiquidity}
                    disabled={loading || !account || !liquidityAmount}
                    style={{
                      padding: '14px 24px',
                      background: loading || !account || !liquidityAmount 
                        ? '#cbd5e0' 
                        : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: loading || !account || !liquidityAmount ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      boxShadow: loading || !account || !liquidityAmount 
                        ? 'none' 
                        : '0 10px 30px rgba(72, 187, 120, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!loading && account && liquidityAmount) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 15px 40px rgba(72, 187, 120, 0.5)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 10px 30px rgba(72, 187, 120, 0.4)';
                    }}
                  >
                    {loading ? '⏳ Processing...' : '➕ Add Liquidity'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#718096', textAlign: 'center' }}>
                  💡 0.1 ETH will be added automatically
                </div>
              </div>

              {/* Custom Amount Liquidity */}
              <div style={{ 
                background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
                borderRadius: '16px', 
                padding: '30px',
                color: 'white'
              }}>
                <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px', fontWeight: '700' }}>
                  🎛️ Custom Add (Price Control)
                </h3>
                <p style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '20px' }}>
                  Set custom ETH and THW amounts
                </p>
                
                {/* Price Preview */}
                {(parseFloat(addEth) > 0 || parseFloat(addThw) > 0) && (
                  <div style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px', textAlign: 'center' }}>
                      💰 Price Preview
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>Current</div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {currentPrice || "0.000000"} ETH
                        </div>
                      </div>
                      <div style={{ color: '#cbd5e0', fontSize: '16px' }}>→</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>Expected</div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          color: parseFloat(expectedPrice) > parseFloat(currentPrice || 0) ? '#48bb78' : 
                                 parseFloat(expectedPrice) < parseFloat(currentPrice || 0) ? '#f56565' : '#e2e8f0'
                        }}>
                          {expectedPrice} ETH
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '5px' }}>ETH Amount</label>
                    <input 
                      type="number" 
                      value={addEth}
                      onChange={(e) => setAddEth(e.target.value)}
                      placeholder="0.0"
                      disabled={loading}
                      style={{
                        padding: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        width: '100%'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '5px' }}>THW Amount</label>
                    <input 
                      type="number" 
                      value={addThw}
                      onChange={(e) => setAddThw(e.target.value)}
                      placeholder="0"
                      disabled={loading}
                      style={{
                        padding: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        width: '100%'
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddLiquidityWithPrice}
                  disabled={loading || !account || !addEth || !addThw}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: loading || !account || !addEth || !addThw 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: loading || !account || !addEth || !addThw ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!loading && account && addEth && addThw) {
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {loading ? '⏳ Processing...' : '🎛️ Add Custom Liquidity'}
                </button>
              </div>
            </div>

            {/* Remove Liquidity Button */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                onClick={handleRemoveLiquidity}
                disabled={loading || !account}
                style={{
                  padding: '14px 32px',
                  background: loading || !account 
                    ? '#e2e8f0' 
                    : 'linear-gradient(135deg, #f56565 0%, #ed8936 100%)',
                  color: loading || !account ? '#a0aec0' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading || !account ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: loading || !account 
                    ? 'none' 
                    : '0 10px 30px rgba(245, 101, 101, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading && account) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 15px 40px rgba(245, 101, 101, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(245, 101, 101, 0.3)';
                }}
              >
                {loading ? '⏳ Processing...' : '🗑️ Remove All Liquidity'}
              </button>
            </div>
          </div>
        )}

        {/* Not Owner Message */}
        {!isOwner && account && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(20px)',
            borderRadius: '20px', 
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <h2 style={{ color: '#1a202c', fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>
              Access Restricted
            </h2>
            <p style={{ color: '#718096', fontSize: '16px' }}>
              Only the contract owner can manage liquidity. You are connected as a viewer.
            </p>
          </div>
        )}

        {/* Price Chart Section */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '20px', 
          padding: '40px',
          marginTop: '30px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ color: '#1a202c', fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>
              📈 THW/ETH Price Chart
            </h2>
            <p style={{ color: '#718096', fontSize: '16px' }}>
              Real-time price tracking (Last 20 updates)
            </p>
          </div>

          {/* Current Price Display */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px', 
            padding: '20px',
            marginBottom: '30px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '5px', opacity: 0.9 }}>
              Current Price
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              fontFamily: 'monospace'
            }}>
              {currentPrice || "0.000000"} ETH
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
              1 THW = {currentPrice || "0.000000"} ETH
            </div>
          </div>

          {/* Chart Container */}
          <div style={{ 
            background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
            borderRadius: '16px', 
            padding: '30px',
            height: '400px',
            position: 'relative'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#764ba2" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255, 255, 255, 0.1)" 
                  vertical={false} 
                />
                
                <XAxis 
                  dataKey="time" 
                  stroke="#a0aec0" 
                  fontSize={12} 
                  tickMargin={10}
                  tick={{ fill: '#a0aec0' }}
                />
                
                <YAxis 
                  domain={['auto', 'auto']}
                  stroke="#a0aec0" 
                  fontSize={12} 
                  tickFormatter={(val) => parseFloat(val).toFixed(6)}
                  tick={{ fill: '#a0aec0' }}
                />
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 32, 44, 0.95)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#a0aec0', fontSize: '12px' }}
                  itemStyle={{ color: '#667eea', fontWeight: '600' }}
                  formatter={(value) => [`${parseFloat(value).toFixed(6)} ETH`, 'Price']}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="url(#colorGradient)" 
                  strokeWidth={3}
                  dot={{ fill: '#667eea', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#764ba2' }}
                  name="THW/ETH Price"
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Chart Overlay Info */}
            {chartData.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '16px' }}>No price data yet</div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Add liquidity to start tracking prices
                </div>
              </div>
            )}
          </div>

          {/* Chart Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px', 
            marginTop: '30px' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
              borderRadius: '12px', 
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '5px' }}>
                Data Points
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#2d3748' }}>
                {chartData.length}
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)',
              borderRadius: '12px', 
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '5px' }}>
                Last Update
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#2d3748' }}>
                {chartData.length > 0 ? chartData[chartData.length - 1].time : '--:--:--'}
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #fffbf0 0%, #fef5e7 100%)',
              borderRadius: '12px', 
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '5px' }}>
                Auto Refresh
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#2d3748' }}>
                Every 10 seconds
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}; 
