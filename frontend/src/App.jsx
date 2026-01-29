import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Schedule from './pages/Schedule';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import AuthModal from './components/Auth/AuthModal';
import Organization from './pages/Organization';
import Profile from './pages/Profile';
import { useLocation } from 'react-router-dom';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();
  const isMeetingRoom = location.pathname.startsWith('/room/');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleSetUser = (u) => {
    setUser(u);
    if (u) {
      localStorage.setItem('user', JSON.stringify(u));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  return (
    <div className={`app-container ${isMeetingRoom ? 'meeting-mode' : ''}`}>
      <main className="main-content" style={{ width: '100%' }}>
        {!isMeetingRoom && <TopBar user={user} setUser={handleSetUser} openAuth={() => setIsAuthOpen(true)} />}
        <div className="page-wrapper">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/room/:roomId" element={<Room user={user} />} />
              <Route path="/schedule" element={<Schedule user={user} />} />
              <Route path="/profile" element={<Profile user={user} setUser={handleSetUser} />} />
              {user?.role === 'owner' && <Route path="/organization" element={<Organization user={user} />} />}
            </Routes>
          </div>
        </main>
        
        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          onLogin={handleSetUser} 
        />
      </div>
    );
}

export default App;
