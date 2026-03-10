export type SearchField = 'all' | 'name' | 'phone' | 'city' | 'address' | 'room';
export type SortOption = 'name-asc' | 'name-desc' | 'phone-asc' | 'city-asc' | 'recently-added';

interface TenantSearchFiltersProps {
  searchQuery: string;
  searchField: SearchField;
  sortBy: SortOption;
  onSearchQueryChange: (query: string) => void;
  onSearchFieldChange: (field: SearchField) => void;
  onSortByChange: (option: SortOption) => void;
  onClearSearch: () => void;
}

const searchFieldOptions: { value: SearchField; label: string }[] = [
  { value: 'all', label: 'All Fields' },
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'city', label: 'City' },
  { value: 'address', label: 'Address' },
  { value: 'room', label: 'Room Number' },
];

export default function TenantSearchFilters({
  searchQuery,
  searchField,
  sortBy,
  onSearchQueryChange,
  onSearchFieldChange,
  onSortByChange,
  onClearSearch,
}: TenantSearchFiltersProps) {
  return (
    <div className="search-section">
      <div className="search-container">
        <input
          type="text"
          placeholder={searchField === 'phone' ? 'Search phone numbers...' : 'Search tenants...'}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>
      <div className="filter-container">
        <label htmlFor="search-field">Search by:</label>
        <select
          id="search-field"
          value={searchField}
          onChange={(e) => onSearchFieldChange(e.target.value as SearchField)}
          className="search-field-select"
        >
          {searchFieldOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sort-container">
        <label htmlFor="sort-by">Sort by:</label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortOption)}
          className="sort-select"
        >
          <option value="name-asc">Name (A→Z)</option>
          <option value="name-desc">Name (Z→A)</option>
          <option value="phone-asc">Phone Number</option>
          <option value="city-asc">City</option>
          <option value="recently-added">Recently Added</option>
        </select>
      </div>
      {searchQuery && (
        <button
          className="btn-secondary btn-clear"
          onClick={onClearSearch}
        >
          Clear Search
        </button>
      )}
    </div>
  );
}
