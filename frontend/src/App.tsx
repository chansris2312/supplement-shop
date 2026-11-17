import { Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { RequireAuth } from './components/RequireAuth';
import { Toast } from './components/ui';
import { useStore } from './state/StoreContext';
import Shop from './pages/Shop';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Cart from './pages/Cart';
import History from './pages/History';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function App() {
  const { toast } = useStore();
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Navbar />
      <div className="flex flex-col">
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/quiz" element={<RequireAuth><Quiz /></RequireAuth>} />
          <Route path="/result" element={<RequireAuth><Result /></RequireAuth>} />
          <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="*" element={<Shop />} />
        </Routes>
      </div>
      <Toast message={toast} />
    </div>
  );
}
