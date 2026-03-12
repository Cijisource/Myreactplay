import { useState, useEffect } from 'react';
import { apiService } from '../api';
import SearchableDropdown from './SearchableDropdown';
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
  const [viewMode, setViewMode] = useState<'list' | 'category'>('category');

  // Helper to format date as YYYY-MM-DD using local date (no timezone conversion)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get current month date range
  const getCurrentMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: formatLocalDate(firstDay),
      endDate: formatLocalDate(lastDay)
    };
  };

  const monthDates = getCurrentMonthDates();
  const [dateRange, setDateRange] = useState({
    startDate: monthDates.startDate,
    endDate: monthDates.endDate
  });

  const [formData, setFormData] = useState({
    description: '',
    transactionTypeId: 0,
    transactionDate: formatLocalDate(new Date()),
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
        transactionDate: formatLocalDate(new Date()),
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

  // Filter and sort transactions
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transactionDate);
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    return transactionDate >= startDate && 
           transactionDate <= endDate &&
           t.description.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
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
        <div className="date-filter-group">
          <label>From:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="date-input"
          />
          <label>To:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="date-input"
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              const dates = getCurrentMonthDates();
              setDateRange({ startDate: dates.startDate, endDate: dates.endDate });
            }}
            title="Reset to current month"
          >
            Reset
          </button>
        </div>
        <SearchableDropdown
          value={sortBy}
          onChange={(option) => setSortBy(option.id as any)}
          options={[
            { id: 'date-desc', label: 'Newest First' },
            { id: 'amount-desc', label: 'Highest Amount' },
            { id: 'amount-asc', label: 'Lowest Amount' }
          ]}
          placeholder="Sort by..."
        />
        <div className="view-mode-toggle">
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            📋 List
          </button>
          <button
            className={`btn ${viewMode === 'category' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('category')}
            title="Category-wise view"
          >
            🏷️ Category
          </button>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingTransaction(null);
            setFormData({
              description: '',
              transactionTypeId: 0,
              transactionDate: formatLocalDate(new Date()),
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
            <SearchableDropdown
              value={formData.transactionTypeId || null}
              onChange={(option) => setFormData({ ...formData, transactionTypeId: option.id as number })}
              options={transactionTypes.map(type => ({ id: type.id, label: type.transactionType }))}
              placeholder="Select Transaction Type"
            />
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
      ) : filteredTransactions.length === 0 ? (
        <div className="no-results-message">
          <p>No transactions found.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Date</th>
                <th className="text-right">Amount (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.description}</td>
                  <td>{transaction.transactionType?.transactionType || 'Unknown'}</td>
                  <td>{new Date(transaction.transactionDate).toLocaleDateString()}</td>
                  <td className="text-right">{transaction.amount.toFixed(2)}</td>
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
      ) : (
        <div>
          {Object.entries(
            filteredTransactions.reduce((groups: { [key: number]: { type: string; transactions: Transaction[]; total: number } }, transaction) => {
              const typeId = transaction.transactionTypeId;
              if (!groups[typeId]) {
                groups[typeId] = {
                  type: transaction.transactionType?.transactionType || 'Unknown',
                  transactions: [],
                  total: 0
                };
              }
              groups[typeId].transactions.push(transaction);
              groups[typeId].total += transaction.amount;
              return groups;
            }, {})
          ).map(([typeId, groupedData]) => (
            <div key={typeId} className="category-section">
              <div className="category-header">
                <h3 className="category-title">
                  💰 {groupedData.type}
                </h3>
                <div className="category-stats">
                  <span className="stat-badge">Count: {groupedData.transactions.length}</span>
                  <span className="stat-badge total">Total: ₹{groupedData.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th className="text-right">Amount (₹)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.description}</td>
                        <td>{new Date(transaction.transactionDate).toLocaleDateString()}</td>
                        <td className="text-right">{transaction.amount.toFixed(2)}</td>
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
            </div>
          ))}
          {filteredTransactions.length > 0 && (
            <div className="net-balance-summary">
              <div className="net-balance-content">
                <span className="net-balance-label">Net Balance (Total Amount):</span>
                <span className="net-balance-value">₹{filteredTransactions.reduce((sum, t) => {
                  const transactionType = t.transactionType?.transactionType;
                  if (transactionType === 'Income' || transactionType === 'CashDep') {
                    return sum + t.amount;
                  } else if (transactionType === 'Expense') {
                    return sum - t.amount;
                  }
                  return sum;
                }, 0).toFixed(2)}</span>
              </div>
            </div>
          )}
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
