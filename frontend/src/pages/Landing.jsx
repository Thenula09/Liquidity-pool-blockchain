import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#0a0b0d] via-[#1a1b1e] to-[#25262b] flex flex-col items-center justify-center text-white font-sans overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00ff88]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 w-full max-w-4xl mx-auto">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#00ff88] rounded-full flex items-center justify-center shadow-lg shadow-[#00ff88]/30">
              <span className="text-black font-bold text-xl">THW</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-[#00ff88] bg-clip-text text-transparent">
              THW Exchange
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">Decentralized Token Trading Platform</p>
          <p className="text-gray-400">Trade THW tokens with Ethereum on the blockchain</p>
        </div>

        {/* Role selection cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          {/* Owner Card */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[#1a1d23] border border-[#3a3d45] rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Pool Owner</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Manage liquidity pool, add/remove liquidity, monitor pool statistics and trading activity
                </p>
                <button 
                  onClick={() => navigate('/owner')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                >
                  Owner Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Trader Card */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00ff88] to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[#1a1d23] border border-[#3a3d45] rounded-2xl p-8 hover:border-[#00ff88]/50 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00ff88] to-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Trader</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Buy and sell THW tokens, view real-time charts, track transaction history
                </p>
                <button 
                  onClick={() => navigate('/trader')}
                  className="w-full bg-gradient-to-r from-[#00ff88] to-blue-600 hover:from-[#00e67a] hover:to-blue-700 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#00ff88]/25"
                >
                  Trader Terminal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h4 className="font-semibold text-white mb-1">Secure Trading</h4>
            <p className="text-sm text-gray-400">Blockchain-powered transactions</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-white mb-1">Real-time Charts</h4>
            <p className="text-sm text-gray-400">Live price tracking and analytics</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-white mb-1">Instant Swaps</h4>
            <p className="text-sm text-gray-400">Fast and efficient token exchanges</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Built with Ethereum Smart Contracts • Powered by Hardhat
          </p>
        </div>
      </div>
    </div>
  );
}
