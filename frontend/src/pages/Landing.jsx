import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to THW Exchange</h1>
      <p>Select your role to continue</p>
      <button onClick={() => navigate('/owner')}>Owner Login</button>
      <button onClick={() => navigate('/trader')}>Buyer / Seller Login</button>
    </div>
  );
}
