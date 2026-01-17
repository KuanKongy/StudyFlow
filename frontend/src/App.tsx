import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from './LoginButton';
import LogoutButton from './LogoutButton';
import Profile from './Profile';

function App() {
  const { isAuthenticated, isLoading, error, getAccessTokenSilently } = useAuth0();
  
  const callApi = async () => {
    if (!isAuthenticated) return;
    const token = await getAccessTokenSilently();
    console.log("Access Token:", token);

    const res = await fetch("http://localhost:4000/api/private", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error("API error", res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log("API response:", data);
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error-state">
          <div className="error-title">Oops!</div>
          <div className="error-message">Something went wrong</div>
          <div className="error-sub-message">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="main-card-wrapper">
        <img 
          src="https://cdn.auth0.com/quantum-assets/dist/latest/logos/auth0/auth0-lockup-en-ondark.png" 
          alt="Auth0 Logo" 
          className="auth0-logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="main-title">Welcome to StudyFlow</h1>
        
        {isAuthenticated ? (
          <div className="logged-in-section">
            <div className="logged-in-message">✅ Successfully authenticated!</div>
            <button onClick={callApi}>Call Backend API</button>
            <h2 className="profile-section-title">Your Profile</h2>
            <div className="profile-card">
              <Profile />
            </div>
            <LogoutButton />
          </div>
        ) : (
          <div className="action-card">
            <p className="action-text">Get started by signing in to your account</p>
            <LoginButton />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;