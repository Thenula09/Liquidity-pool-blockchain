import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import OwnerDashboard from './pages/Owner/Dashboard';
import Swap from './pages/Trader/Swap';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/trader" element={<Swap />} />
      </Routes>
    </Router>
  );
}

export default App;
