import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Schedule from './pages/Schedule';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

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
    <Router>
      <div className="app-container">
        <Sidebar user={user} />
        <main className="main-content">
          <TopBar user={user} setUser={handleSetUser} />
          <div className="page-wrapper">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/room/:roomId" element={<Room user={user} />} />
              <Route path="/schedule" element={<Schedule user={user} />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
