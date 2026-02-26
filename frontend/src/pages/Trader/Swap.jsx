export default function Swap() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ color: '#333', marginBottom: '20px', textAlign: 'center' }}>THW Token Swap</h2>

        {/* Swap Interface */}
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '14px' }}>Amount</label>
            <input 
              type="number" 
              placeholder="Enter amount" 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ddd', 
                borderRadius: '6px',
                fontSize: '16px'
              }} 
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '14px' }}>Swap Direction</label>
            <select style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #ddd', 
              borderRadius: '6px',
              fontSize: '16px'
            }}>
              <option>ETH → THW</option>
              <option>THW → ETH</option>
            </select>
          </div>

          <div style={{ 
            backgroundColor: '#e9ecef', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Rate:</span>
              <strong>1 ETH = 500 THW</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>You'll receive:</span>
              <strong>500 THW</strong>
            </div>
          </div>

          <button 
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Swap Tokens
          </button>
        </div>

        {/* Additional Info */}
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          <p>Current Price: 1 THW = 0.002 ETH</p>
          <p>Network: Hardhat Local Network</p>
        </div>
      </div>
    </div>
  );
}
