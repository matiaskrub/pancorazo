import React, { useState } from 'react';
import { CommunityProvider } from './contexts/CommunityContext';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Rankings from './pages/Rankings';
import Profile from './pages/Profile';
import DeckBuilder from './pages/DeckBuilder';
import Library from './pages/Library';
import Tournaments from './pages/Tournaments';
import HallOfFame from './pages/HallOfFame';
import DeckExplorer from './pages/DeckExplorer';
import DeckViewer from './pages/DeckViewer';
import AdminDashboard from './pages/AdminDashboard';
import TeamProfile from './pages/TeamProfile';
import Teams from './pages/Teams';
import TournamentDetail from './pages/TournamentDetail';
import CategoryDetail from './pages/CategoryDetail';
import Novedades from './pages/Novedades';
import NoticiaDetalle from './pages/NoticiaDetalle';
import SearchResults from './pages/SearchResults';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';
import Limbo from './pages/Limbo';
import Rejected from './pages/Rejected';
import { apiService } from './services/api';
import { User } from './types';

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedUser = localStorage.getItem('user');
  const user: User | null = savedUser ? JSON.parse(savedUser) : null;

  if (!user || (user.global_role !== 'SUPER_ADMIN' && user.global_role !== 'ADMIN' && user.global_role !== 'EDITOR')) {
    return <Home />;
  }

  return <>{children}</>;
};

const ProtectedBuilderRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedUser = localStorage.getItem('user');
  const user: User | null = savedUser ? JSON.parse(savedUser) : null;

  if (!user) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

interface AppContentProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  handleLogout: () => Promise<void>;
}

const AppContent: React.FC<AppContentProps> = ({ currentUser, setCurrentUser, handleLogout }) => {
  const location = useLocation();
  
  // Permitir el acceso a la ruta de recuperación de contraseña sin autenticación
  const isResetPasswordRoute = location.pathname.startsWith('/recuperar/');



  if (currentUser && currentUser.status === 'PENDING') {
    return (
      <Limbo 
        user={currentUser} 
        onLogout={handleLogout} 
        onStatusUpdate={(updatedUser) => setCurrentUser(updatedUser)} 
      />
    );
  }

  if (currentUser && currentUser.status === 'REJECTED') {
    return (
      <Rejected user={currentUser} onLogout={handleLogout} />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col text-white font-display">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/ranking-oficial" element={<Rankings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/builder" element={<ProtectedBuilderRoute><DeckBuilder /></ProtectedBuilderRoute>} />
          <Route path="/library" element={<Library />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/equipos" element={<Teams />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/explorer" element={<DeckExplorer />} />
          <Route path="/deck/:id" element={<DeckViewer />} />
          <Route path="/team/:teamSlug" element={<TeamProfile />} />
          <Route path="/admin-dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/tournament/:id" element={<TournamentDetail />} />
          <Route path="/category/:categoryId" element={<CategoryDetail />} />
          <Route path="/novedades" element={<Novedades />} />
          <Route path="/novedades/:id" element={<NoticiaDetalle />} />
          <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/recuperar/:token" element={<ResetPassword />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = async () => {
    try {
      await apiService.logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <CommunityProvider>
      <Router>
        <ScrollToTop />
        <AppContent 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          handleLogout={handleLogout} 
        />
      </Router>
    </CommunityProvider>
  );
};

export default App;
