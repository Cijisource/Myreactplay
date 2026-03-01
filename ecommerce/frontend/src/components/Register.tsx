import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface RegisterProps {
  onRegisterSuccess: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      onRegisterSuccess();
      navigate('/login');
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Create Account</h2>
        <p>Join ShopHub and start shopping today</p>
        {error && <div className="error-message">❌ {error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={handleChange}
            required
            aria-label="First name"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={handleChange}
            required
            aria-label="Last name"
          />
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
            aria-label="Email"
          />
          <input
            type="password"
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            required
            aria-label="Password"
          />
          <button type="submit" className="auth-btn">✍️ Create Account</button>
        </form>
        <p>Already have an account? <a href="/login">Sign in here</a></p>
      </div>
    </div>
  );
};
