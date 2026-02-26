import { useState, useEffect } from 'react';
import { apiService } from '../api';
import './ManagementStyles.css';

interface Transaction {
  id: number;
  description: string;
  transactionTypeId: number;
  transactionDate: string;
  createdDate: string;
  updatedDate?: string;
  amount: number;
  occupancyId?: number;
  transactionType?: {
    id: number;
    transactionType: string;
  };
}

interface TransactionType {
  id: number;
  transactionType: string;
}

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const [formData, setFormData] = useState({
    description: '',
    transactionTypeId: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    occupancyId: ''
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTransactions();
      setTransactions(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction types
  const fetchTransactionTypes = async () => {
    try {
      const response = await apiService.getTransactionTypes();
      setTransactionTypes(response.data);
    } catch (err) {
      console.error('Failed to fetch transaction types:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchTransactionTypes();
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const dataToSubmit = {
        ...formData,
        transactionTypeId: parseInt(formData.transactionTypeId.toString()),
        occupancyId: formData.occupancyId ? parseInt(formData.occupancyId.toString()) : null
      };

      if (editingTransaction) {
        await apiService.updateTransaction(editingTransaction.id, dataToSubmit);
        setSuccessMessage('Transaction updated successfully!');
      } else {
        await apiService.createTransaction(dataToSubmit);
        setSuccessMessage('Transaction created successfully!');
      }

      setShowForm(false);
      setEditingTransaction(null);
      setFormData({
        description: '',
        transactionTypeId: 0,
        transactionDate: new Date().toISOString().split('T')[0],
        amount: 0,
        occupancyId: ''
      });
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction
  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await apiService.deleteTransaction(id);
      setSuccessMessage('Transaction deleted successfully!');
      setShowDeleteConfirm(null);
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

  // Edit transaction
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      transactionTypeId: transaction.transactionTypeId,
      transactionDate: transaction.transactionDate.split('T')[0],
      amount: transaction.amount,
      occupancyId: transaction.occupancyId?.toString() || ''
    });
    setShowForm(true);
  };

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      default:
        return 0;
    }
  });

  return (
    <div className="management-container">
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="sort-select"
        >
          <option value="date-desc">Newest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingTransaction(null);
            setFormData({
              description: '',
              transactionTypeId: 0,
              transactionDate: new Date().toISOString().split('T')[0],
              amount: 0,
              occupancyId: ''
            });
            setShowForm(true);
          }}
        >
          + Add Transaction
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <select
              value={formData.transactionTypeId}
              onChange={(e) => setFormData({ ...formData, transactionTypeId: parseInt(e.target.value) })}
              required
            >
              <option value={0}>Select Transaction Type</option>
              {transactionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.transactionType}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={formData.transactionDate}
              onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              required
            />
            <input
              type="number"
              placeholder="Occupancy ID (optional)"
              value={formData.occupancyId}
              onChange={(e) => setFormData({ ...formData, occupancyId: e.target.value })}
            />
            <div className="form-buttons">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Saving...' : 'Save Transaction'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.description}</td>
                  <td>{transaction.transactionType?.transactionType || 'N/A'}</td>
                  <td>{new Date(transaction.transactionDate).toLocaleDateString()}</td>
                  <td className="amount">${transaction.amount.toFixed(2)}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-info" onClick={() => handleEdit(transaction)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setShowDeleteConfirm(transaction.id)}
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

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this transaction?</p>
            <div className="modal-buttons">
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
