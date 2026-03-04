import { useState, useRef, useEffect } from 'react';
import '../styles/SearchableDropdown.css';

interface Option {
  id: string | number;
  label: string;
  value?: string | number;
  [key: string]: any;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string | number | null;
  onChange: (option: Option) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  isLoading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onSearch?: (searchTerm: string) => void;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  label,
  isLoading = false,
  error = null,
  disabled = false,
  onSearch,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the display label for the selected value
  const selectedOption = options.find(opt => opt.id === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      onSearch?.('');
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(term) ||
        (opt.value && opt.value.toString().toLowerCase().includes(term))
      );
      setFilteredOptions(filtered);
      onSearch?.(term);
    }
  }, [searchTerm, options, onSearch]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: Option) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className="searchable-dropdown-wrapper">
      {label && <label className="dropdown-label">{label}</label>}
      
      <div className={`searchable-dropdown ${isOpen ? 'open' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        <div
          className="dropdown-input-wrapper"
          onClick={() => !disabled && handleInputClick()}
        >
          <input
            ref={inputRef}
            type="text"
            className="dropdown-input"
            placeholder={searchPlaceholder}
            value={isOpen ? searchTerm : displayLabel}
            onChange={handleInputChange}
            onClick={handleInputClick}
            disabled={disabled}
          />
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
            {isLoading ? '⟳' : '▼'}
          </span>
        </div>

        {error && <div className="dropdown-error">{error}</div>}

        {isOpen && (
          <div className="dropdown-options">
            {isLoading ? (
              <div className="dropdown-loading">Loading...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`dropdown-option ${value === option.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="dropdown-empty">
                {searchTerm ? 'No results found' : 'No options available'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
