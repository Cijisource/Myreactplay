import React, { useState, useEffect, useCallback } from 'react';
import { getShippingZones, addShippingZone, updateShippingZone, deleteShippingZone } from '../api';
import './ShippingZoneManagement.css';

const ShippingZoneManagement = ({ onClose }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    zone_name: '',
    zone_code: '',
    shipping_charge: '',
    description: ''
  });

  const loadZonesMemo = useCallback(() => {
    loadZones();
  }, []);

  useEffect(() => {
    loadZonesMemo();
  }, [loadZonesMemo]);

  const loadZones = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await getShippingZones();
      console.log('[ShippingZoneManagement] Zones loaded:', response.data);
      const zonesData = Array.isArray(response.data) ? response.data : [];
      setZones(zonesData);
      
      if (zonesData.length === 0) {
        setMessage('No shipping zones found in database. Please add zones to get started.');
        setMessageType('info');
      }
    } catch (err) {
      console.error('[ShippingZoneManagement] Error loading zones:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error loading shipping zones';
      setMessage(errorMsg);
      setMessageType('error');
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      zone_name: '',
      zone_code: '',
      shipping_charge: '',
      description: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.zone_name.trim() || !formData.zone_code.trim() || !formData.shipping_charge) {
      setMessage('Zone name, zone code, and shipping charge are required');
      setMessageType('error');
      return;
    }

    try {
      if (editingId) {
        await updateShippingZone(editingId, formData);
        setMessage('Shipping zone updated successfully');
        setMessageType('success');
      } else {
        await addShippingZone(formData);
        setMessage('Shipping zone added successfully');
        setMessageType('success');
      }
      resetForm();
      loadZones();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error saving shipping zone');
      setMessageType('error');
      console.error(err);
    }
  };

  const handleEdit = (zone) => {
    setFormData({
      zone_name: zone.zone_name,
      zone_code: zone.zone_code,
      shipping_charge: zone.shipping_charge,
      description: zone.description || ''
    });
    setEditingId(zone.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shipping zone?')) {
      return;
    }

    try {
      await deleteShippingZone(id);
      setMessage('Shipping zone deleted successfully');
      setMessageType('success');
      loadZones();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error deleting shipping zone');
      setMessageType('error');
      console.error(err);
    }
  };

  return (
    <div className="szm-modal">
      <div className="szm-container">
        <div className="szm-header">
          <h2>Manage Shipping Zones</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="szm-content">
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          {loading && <div className="loading">Loading shipping zones...</div>}

          {!loading && (
            <>
              {!showForm ? (
                <div className="zones-list-section">
                  <button 
                    className="btn btn-primary mb-20"
                    onClick={() => setShowForm(true)}
                  >
                    + Add New Zone
                  </button>

                  {zones.length === 0 ? (
                    <p className="empty-message">No shipping zones found</p>
                  ) : (
                    <div className="zones-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Zone Name</th>
                            <th>Zone Code</th>
                            <th>Shipping Charge (₹)</th>
                            <th>Description</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zones.map(zone => (
                            <tr key={zone.id}>
                              <td>{zone.zone_name}</td>
                              <td><code>{zone.zone_code}</code></td>
                              <td className="charge">{zone.shipping_charge}</td>
                              <td>{zone.description || '-'}</td>
                              <td className="actions">
                                <button
                                  className="btn btn-sm btn-info"
                                  onClick={() => handleEdit(zone)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDelete(zone.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-section">
                  <h3>{editingId ? 'Edit Zone' : 'Add New Zone'}</h3>
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="zone_name">Zone Name *</label>
                      <input
                        type="text"
                        id="zone_name"
                        name="zone_name"
                        value={formData.zone_name}
                        onChange={handleChange}
                        placeholder="e.g., Metro Cities"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="zone_code">Zone Code *</label>
                      <input
                        type="text"
                        id="zone_code"
                        name="zone_code"
                        value={formData.zone_code}
                        onChange={handleChange}
                        placeholder="e.g., metro"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="shipping_charge">Shipping Charge (₹) *</label>
                      <input
                        type="number"
                        id="shipping_charge"
                        name="shipping_charge"
                        value={formData.shipping_charge}
                        onChange={handleChange}
                        placeholder="e.g., 49"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="e.g., Applies to major metro cities"
                        rows="3"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingId ? 'Update Zone' : 'Add Zone'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={resetForm}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingZoneManagement;
