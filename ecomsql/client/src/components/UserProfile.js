import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout as logoutAPI, getUserRoles, getCustomerLoyalty } from '../api';
import { getUser, clearAuth } from '../utils/authUtils';
import CustomerRewards from './CustomerRewards';
import './UserProfile.css';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState('');
  const [rewards, setRewards] = useState(null);
  const navigate = useNavigate();

  const loadUserProfileMemo = useCallback(() => {
    loadUserProfile();
  }, []);

  const fetchRolesMemo = useCallback(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    loadUserProfileMemo();
  }, [loadUserProfileMemo]);

  // Fetch roles only for administrator users after user is loaded
  useEffect(() => {
    if (user && user.roleType === 'Administrator') {
      fetchRolesMemo();
    }
  }, [user, fetchRolesMemo]);

  // Fetch rewards after user is loaded
  useEffect(() => {
    if (user && user.userName) {
      fetchRewards();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const currentUser = getUser();
      if (currentUser) {
        setUser(currentUser);
      }
      
      // Try to fetch fresh user data from server
      try {
        const response = await getCurrentUser();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user profile from server:', error);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      setError('');
      const response = await getUserRoles();
      setRoles(response.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setError('Failed to load available roles');
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      const currentUser = getUser();
      console.log('[DEBUG] fetchRewards - currentUser:', currentUser);
      
      if (currentUser && currentUser.userName) {
        // userName field contains the email address
        const email = currentUser.userName;
        console.log('[DEBUG] fetchRewards - using email from userName:', email);
        
        const response = await getCustomerLoyalty(email);
        console.log('[DEBUG] fetchRewards - response:', response.data);
        setRewards(response.data);
      } else {
        console.warn('[DEBUG] fetchRewards - no currentUser or userName found');
      }
    } catch (error) {
      console.error('Failed to fetch rewards data:', error);
      // Rewards data is optional, so don't set error state
    }
  };

  const handleLogout = () => {
    logoutAPI();
    clearAuth();
    navigate('/login');
  };

  if (loading) {
    return <div className="user-profile-loading">Loading...</div>;
  }

  if (!user) {
    return <div className="user-profile-error">No user information available</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-card">
        <div className="profile-header">
          <h2>User Profile</h2>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>

        {error && <div className="profile-error">{error}</div>}

        <div className="profile-content">
          <div className="profile-field">
            <label>Username:</label>
            <span>{user.userName}</span>
          </div>

          <div className="profile-field">
            <label>Full Name:</label>
            <span>{user.name}</span>
          </div>

          <div className="profile-field">
            <label>Role:</label>
            <span className={`role-badge role-${user.roleType?.toLowerCase()}`}>
              {user.role || user.roleType || 'N/A'}
            </span>
          </div>

          {user.createdDate && (
            <div className="profile-field">
              <label>Member Since:</label>
              <span>{new Date(user.createdDate).toLocaleDateString()}</span>
            </div>
          )}

          {user.lastLogin && (
            <div className="profile-field">
              <label>Last Login:</label>
              <span>{new Date(user.lastLogin).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {rewards && (
        <div className="rewards-card">
          <div className="rewards-header">
            <h3>Reward Points</h3>
            <div className="tier-badge">{rewards.loyalty_tier || 'Silver'}</div>
          </div>

          <div className="rewards-content">
            <div className="rewards-grid">
              <div className="reward-item">
                <div className="reward-label">Total Points</div>
                <div className="reward-value">{rewards.total_points || 0}</div>
              </div>

              <div className="reward-item highlight">
                <div className="reward-label">Available Points</div>
                <div className="reward-value">{rewards.available_points || 0}</div>
              </div>

              <div className="reward-item">
                <div className="reward-label">Redeemed Points</div>
                <div className="reward-value">{rewards.redeemed_points || 0}</div>
              </div>

              <div className="reward-item">
                <div className="reward-label">Total Spent</div>
                <div className="reward-value">₹{(rewards.total_spent || 0).toFixed(2)}</div>
              </div>

              <div className="reward-item">
                <div className="reward-label">Orders Placed</div>
                <div className="reward-value">{rewards.order_count || 0}</div>
              </div>

              {rewards.last_order_date && (
                <div className="reward-item">
                  <div className="reward-label">Last Order</div>
                  <div className="reward-value">{new Date(rewards.last_order_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user.roleType === 'Administrator' && (
      <div className="roles-card">
        <div className="roles-header">
          <h3>Available Roles</h3>
          {rolesLoading && <span className="loading-text">Loading...</span>}
        </div>

        {roles.length > 0 ? (
          <div className="roles-list">
            {roles.map((role) => (
              <div key={role.Id} className={`role-item ${user.roleType === role.RoleType ? 'active' : ''}`}>
                <div className="role-type">{role.RoleType}</div>
                <div className="role-name">{role.RoleName}</div>
                {user.roleType === role.RoleType && (
                  <div className="role-current-badge">Your Role</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-roles">
            {rolesLoading ? 'Loading roles...' : 'No roles available'}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default UserProfile;
