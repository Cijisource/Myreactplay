import React, { useState, useEffect, useCallback } from 'react';
import { getAllUsers, getUserRoles, updateUserRole, resetUserPassword } from '../api';
import './RoleManagement.css';

const RoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchUsersAndRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [usersResponse, rolesResponse] = await Promise.all([
        getAllUsers(),
        getUserRoles()
      ]);

      setUsers(usersResponse.data.users || []);
      setRoles(rolesResponse.data || []);
    } catch (err) {
      console.error('Error fetching users and roles:', err);
      setError('Failed to load users and roles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      setError('');
      setSuccessMessage('');
      
      await updateUserRole(userId, parseInt(newRoleId));
      
      setSuccessMessage(`Role updated successfully for user ${userId}`);
      
      // Refresh the users list
      setTimeout(() => {
        fetchUsersAndRoles();
        setSelectedUserId(null);
        setSelectedRoleId('');
      }, 1000);
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role. Please try again.');
    }
  };

  const getRoleNameById = (roleId) => {
    const role = roles.find(r => r.Id === roleId);
    return role ? role.RoleName : 'N/A';
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please enter both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      await resetUserPassword(selectedUserId, newPassword);

      setSuccessMessage('Password reset successfully!');
      setResetPasswordMode(false);
      setNewPassword('');
      setConfirmPassword('');

      // Refresh the users list
      setTimeout(() => {
        fetchUsersAndRoles();
        setSelectedUserId(null);
      }, 1500);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password. Please try again.');
    }
  };



  if (loading) {
    return <div className="role-management-container"><p>Loading users and roles...</p></div>;
  }

  return (
    <div className="role-management-container">
      <div className="role-management-header">
        <h2>Role Management</h2>
        <p className="subtitle">Manage user roles and permissions</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="role-management-content">
        <div className="users-section">
          <h3>Users ({users.length})</h3>
          
          {users.length === 0 ? (
            <p className="no-data">No users found.</p>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Password</th>
                    <th>Current Role</th>
                    <th>Role Type</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.Id} className={selectedUserId === user.Id ? 'selected' : ''}>
                      <td>{user.Id}</td>
                      <td className="username">{user.UserName}</td>
                      <td>{user.Name}</td>
                      <td className="password-cell">{user.Password || 'N/A'}</td>
                      <td>
                        <span className="role-badge">{getRoleNameById(user.RoleId) || 'None'}</span>
                      </td>
                      <td>
                        <span className={`role-type ${user.RoleType?.toLowerCase()}`}>
                          {user.RoleType || 'N/A'}
                        </span>
                      </td>
                      <td>{new Date(user.CreatedDate).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-edit-role"
                          onClick={() => setSelectedUserId(user.Id)}
                        >
                          Change Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedUserId && (
          <div className="role-editor-section">
            <div className="role-editor-card">
              <h3>{resetPasswordMode ? 'Reset User Password' : 'Change User Role'}</h3>
              
              {users.map((user) => {
                if (user.Id === selectedUserId) {
                  return (
                    <div key={user.Id} className="user-info">
                      <div className="user-details">
                        <p><strong>Username:</strong> {user.UserName}</p>
                        <p><strong>Full Name:</strong> {user.Name}</p>
                        <p><strong>Password:</strong> {user.Password || 'N/A'}</p>
                        <p><strong>Current Role:</strong> {getRoleNameById(user.RoleId) || 'None'}</p>
                        <p><strong>Current Role Type:</strong> {user.RoleType || 'None'}</p>
                      </div>

                      {!resetPasswordMode ? (
                        <>
                          <div className="role-select-group">
                            <label htmlFor="new-role">Select New Role</label>
                            <select
                              id="new-role"
                              value={selectedRoleId}
                              onChange={(e) => setSelectedRoleId(e.target.value)}
                              className="role-select"
                            >
                              <option value="">-- Choose a role --</option>
                              {roles.map((role) => (
                                <option key={role.Id} value={role.Id}>
                                  {role.RoleName} ({role.RoleType})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="role-editor-actions">
                            <button
                              className="btn btn-primary"
                              onClick={() => handleRoleChange(user.Id, selectedRoleId)}
                              disabled={!selectedRoleId}
                            >
                              Update Role
                            </button>
                            <button
                              className="btn btn-warning"
                              onClick={() => setResetPasswordMode(true)}
                            >
                              Reset Password
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedUserId(null);
                                setSelectedRoleId('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="password-reset-group">
                            <div className="password-field">
                              <label htmlFor="new-password">New Password:</label>
                              <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                                className="password-input"
                              />
                            </div>

                            <div className="password-field">
                              <label htmlFor="confirm-password">Confirm Password:</label>
                              <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="password-input"
                              />
                            </div>
                          </div>

                          <div className="role-editor-actions">
                            <button
                              className="btn btn-primary"
                              onClick={handleResetPassword}
                              disabled={!newPassword || !confirmPassword}
                            >
                              Reset Password
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setResetPasswordMode(false);
                                setNewPassword('');
                                setConfirmPassword('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        <div className="roles-reference">
          <h3>Available Roles</h3>
          {roles.length === 0 ? (
            <p className="no-data">No roles found.</p>
          ) : (
            <div className="roles-grid">
              {roles.map((role) => (
                <div key={role.Id} className="role-card">
                  <div className="role-card-type">{role.RoleType}</div>
                  <div className="role-card-name">{role.RoleName}</div>
                  <div className="role-card-id">ID: {role.Id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
