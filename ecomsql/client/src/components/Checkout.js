import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode.react';
import { createOrder } from '../api';
import { getUser } from '../utils/authUtils';
import './Checkout.css';

// Indian cities with zip codes
const CITIES_DATA = [
  // Andhra Pradesh
  { city: 'Visakhapatnam', zipCode: '530001' },
  { city: 'Vijayawada', zipCode: '520001' },
  { city: 'Nellore', zipCode: '524001' },
  { city: 'Tirupati', zipCode: '517501' },
  { city: 'Rajahmundry', zipCode: '533101' },
  { city: 'Guntur', zipCode: '522001' },
  { city: 'Kakinada', zipCode: '533001' },
  { city: 'Tenali', zipCode: '522201' },
  
  // Arunachal Pradesh
  { city: 'Itanagar', zipCode: '791111' },
  { city: 'Naharlagun', zipCode: '792123' },
  
  // Assam
  { city: 'Guwahati', zipCode: '781001' },
  { city: 'Dibrugarh', zipCode: '786001' },
  { city: 'Silchar', zipCode: '788001' },
  { city: 'Barpeta Road', zipCode: '781301' },
  { city: 'Nagaon', zipCode: '782001' },
  
  // Bihar
  { city: 'Patna', zipCode: '800001' },
  { city: 'Gaya', zipCode: '823001' },
  { city: 'Bhagalpur', zipCode: '812001' },
  { city: 'Muzaffarpur', zipCode: '842001' },
  { city: 'Darbhanga', zipCode: '846003' },
  { city: 'Purnia', zipCode: '854301' },
  { city: 'Arrah', zipCode: '802133' },
  
  // Chhattisgarh
  { city: 'Raipur', zipCode: '492001' },
  { city: 'Bilaspur', zipCode: '495001' },
  { city: 'Durg', zipCode: '491001' },
  { city: 'Rajnandgaon', zipCode: '491441' },
  
  // Goa
  { city: 'Panaji', zipCode: '403001' },
  { city: 'Margao', zipCode: '403601' },
  { city: 'Vasco da Gama', zipCode: '403802' },
  
  // Gujarat
  { city: 'Ahmedabad', zipCode: '380001' },
  { city: 'Surat', zipCode: '395001' },
  { city: 'Vadodara', zipCode: '390001' },
  { city: 'Rajkot', zipCode: '360001' },
  { city: 'Bhavnagar', zipCode: '364001' },
  { city: 'Jamnagar', zipCode: '361001' },
  { city: 'Anand', zipCode: '388001' },
  { city: 'Gandhinagar', zipCode: '382001' },
  { city: 'Junagadh', zipCode: '362001' },
  { city: 'Mehsana', zipCode: '384001' },
  { city: 'Nadiad', zipCode: '387001' },
  { city: 'Palanpur', zipCode: '385001' },
  { city: 'Viramgam', zipCode: '382150' },
  
  // Haryana
  { city: 'Gurgaon', zipCode: '122001' },
  { city: 'Faridabad', zipCode: '121001' },
  { city: 'Hisar', zipCode: '125001' },
  { city: 'Rohtak', zipCode: '124001' },
  { city: 'Ambala', zipCode: '134001' },
  { city: 'Yamunanagar', zipCode: '135001' },
  { city: 'Panipat', zipCode: '132103' },
  { city: 'Sonipat', zipCode: '131001' },
  { city: 'Karnal', zipCode: '132001' },
  { city: 'Kaithal', zipCode: '136027' },
  
  // Himachal Pradesh
  { city: 'Shimla', zipCode: '171001' },
  { city: 'Manali', zipCode: '175131' },
  { city: 'Mandi', zipCode: '175001' },
  { city: 'Solan', zipCode: '173211' },
  { city: 'Kangra', zipCode: '176001' },
  
  // Jharkhand
  { city: 'Ranchi', zipCode: '834001' },
  { city: 'Jamshedpur', zipCode: '831001' },
  { city: 'Dhanbad', zipCode: '826001' },
  { city: 'Giridih', zipCode: '815301' },
  { city: 'Deoghar', zipCode: '814112' },
  
  // Karnataka
  { city: 'Bangalore', zipCode: '560001' },
  { city: 'Mysore', zipCode: '570001' },
  { city: 'Mangalore', zipCode: '575001' },
  { city: 'Belgaum', zipCode: '590001' },
  { city: 'Hubli', zipCode: '580001' },
  { city: 'Davangere', zipCode: '577001' },
  { city: 'Hassan', zipCode: '573201' },
  { city: 'Shimoga', zipCode: '577201' },
  { city: 'Gulbarga', zipCode: '585101' },
  { city: 'Kolar', zipCode: '563101' },
  
  // Kerala
  { city: 'Thiruvananthapuram', zipCode: '695001' },
  { city: 'Kochi', zipCode: '682001' },
  { city: 'Kozhikode', zipCode: '673001' },
  { city: 'Thrissur', zipCode: '680001' },
  { city: 'Kottayam', zipCode: '686001' },
  { city: 'Kannur', zipCode: '670001' },
  { city: 'Pathanamthitta', zipCode: '689645' },
  { city: 'Idukki', zipCode: '685553' },
  { city: 'Malappuram', zipCode: '676501' },
  
  // Madhya Pradesh
  { city: 'Bhopal', zipCode: '462001' },
  { city: 'Indore', zipCode: '452001' },
  { city: 'Gwalior', zipCode: '474001' },
  { city: 'Jabalpur', zipCode: '482001' },
  { city: 'Ujjain', zipCode: '456001' },
  { city: 'Sagar', zipCode: '470001' },
  { city: 'Dewas', zipCode: '455001' },
  { city: 'Khargone', zipCode: '451001' },
  { city: 'Vidisha', zipCode: '464001' },
  
  // Maharashtra
  { city: 'Mumbai', zipCode: '400001' },
  { city: 'Pune', zipCode: '411001' },
  { city: 'Nagpur', zipCode: '440001' },
  { city: 'Nashik', zipCode: '422001' },
  { city: 'Aurangabad', zipCode: '431001' },
  { city: 'Solapur', zipCode: '413001' },
  { city: 'Ahmednagar', zipCode: '414001' },
  { city: 'Akola', zipCode: '444001' },
  { city: 'Amravati', zipCode: '444601' },
  { city: 'Kolhapur', zipCode: '416001' },
  { city: 'Sangli', zipCode: '416416' },
  { city: 'Latur', zipCode: '413512' },
  { city: 'Parbhani', zipCode: '431401' },
  { city: 'Nanded', zipCode: '431601' },
  
  // Manipur
  { city: 'Imphal', zipCode: '795001' },
  
  // Meghalaya
  { city: 'Shillong', zipCode: '793001' },
  
  // Mizoram
  { city: 'Aizawl', zipCode: '796001' },
  
  // Nagaland
  { city: 'Kohima', zipCode: '797001' },
  { city: 'Dimapur', zipCode: '797112' },
  
  // Odisha
  { city: 'Bhubaneswar', zipCode: '751001' },
  { city: 'Cuttack', zipCode: '753001' },
  { city: 'Rourkela', zipCode: '769001' },
  { city: 'Balasore', zipCode: '756001' },
  { city: 'Sambalpur', zipCode: '768001' },
  
  // Punjab
  { city: 'Chandigarh', zipCode: '160001' },
  { city: 'Ludhiana', zipCode: '141001' },
  { city: 'Amritsar', zipCode: '143001' },
  { city: 'Patiala', zipCode: '147001' },
  { city: 'Jalandhar', zipCode: '144001' },
  { city: 'Bathinda', zipCode: '151001' },
  { city: 'Mohali', zipCode: '160059' },
  { city: 'Firozpur', zipCode: '152001' },
  { city: 'Gurdaspur', zipCode: '143521' },
  
  // Rajasthan
  { city: 'Jaipur', zipCode: '302001' },
  { city: 'Jodhpur', zipCode: '342001' },
  { city: 'Kota', zipCode: '324001' },
  { city: 'Bikaner', zipCode: '334001' },
  { city: 'Udaipur', zipCode: '313001' },
  { city: 'Ajmer', zipCode: '305001' },
  { city: 'Alwar', zipCode: '301001' },
  { city: 'Bhilwara', zipCode: '311001' },
  { city: 'Sikar', zipCode: '332001' },
  { city: 'Barmer', zipCode: '344001' },
  { city: 'Tonk', zipCode: '304001' },
  
  // Sikkim
  { city: 'Gangtok', zipCode: '737001' },
  
  // Tamil Nadu
  { city: 'Chennai', zipCode: '600001' },
  { city: 'Coimbatore', zipCode: '641001' },
  { city: 'Madurai', zipCode: '625001' },
  { city: 'Tiruchirappalli', zipCode: '620001' },
  { city: 'Salem', zipCode: '636001' },
  { city: 'Tirunelveli', zipCode: '627001' },
  { city: 'Erode', zipCode: '638001' },
  { city: 'Thoothukudi', zipCode: '628001' },
  { city: 'Cuddalore', zipCode: '607001' },
  { city: 'Kanchipuram', zipCode: '631501' },
  { city: 'Thanjavur', zipCode: '613001' },
  
  // Telangana
  { city: 'Hyderabad', zipCode: '500001' },
  { city: 'Secunderabad', zipCode: '500003' },
  { city: 'Warangal', zipCode: '506001' },
  { city: 'Nizamabad', zipCode: '503001' },
  { city: 'Khammam', zipCode: '507001' },
  
  // Tripura
  { city: 'Agartala', zipCode: '799001' },
  
  // Uttar Pradesh
  { city: 'Lucknow', zipCode: '226001' },
  { city: 'Kanpur', zipCode: '208001' },
  { city: 'Ghaziabad', zipCode: '201001' },
  { city: 'Varanasi', zipCode: '221001' },
  { city: 'Meerut', zipCode: '250001' },
  { city: 'Agra', zipCode: '282001' },
  { city: 'Allahabad', zipCode: '211001' },
  { city: 'Mathura', zipCode: '281001' },
  { city: 'Moradabad', zipCode: '244001' },
  { city: 'Firozabad', zipCode: '283203' },
  { city: 'Azamgarh', zipCode: '276001' },
  { city: 'Bareilly', zipCode: '243001' },
  { city: 'Muzaffarnagar', zipCode: '251001' },
  { city: 'Etah', zipCode: '207001' },
  { city: 'Noida', zipCode: '201301' },
  { city: 'Greater Noida', zipCode: '201308' },
  { city: 'Gautam Buddh Nagar', zipCode: '201301' },
  { city: 'Bulandshahr', zipCode: '203001' },
  
  // Uttarakhand
  { city: 'Dehradun', zipCode: '248001' },
  { city: 'Haldwani', zipCode: '263139' },
  { city: 'Nainital', zipCode: '263001' },
  { city: 'Rudrapur', zipCode: '263153' },
  
  // West Bengal
  { city: 'Kolkata', zipCode: '700001' },
  { city: 'Darjeeling', zipCode: '734101' },
  { city: 'Asansol', zipCode: '713301' },
  { city: 'Siliguri', zipCode: '734001' },
  { city: 'Durgapur', zipCode: '713201' },
  { city: 'Bardhaman', zipCode: '713101' },
  { city: 'Howrah', zipCode: '711101' },
  
  // Union Territories
  { city: 'New Delhi', zipCode: '110001' },
  { city: 'Srinagar', zipCode: '190001' },
  { city: 'Jammu', zipCode: '180001' },
  { city: 'Leh', zipCode: '194101' },
  { city: 'Puducherry', zipCode: '605001' },
  { city: 'Yanam', zipCode: '533464' },
  { city: 'Karaikal', zipCode: '609602' },
  { city: 'Mahe', zipCode: '673331' },
  { city: 'Port Blair', zipCode: '744101' },
  { city: 'Kavaratti', zipCode: '682551' },
  { city: 'Silvassa', zipCode: '396230' },
  { city: 'Diu', zipCode: '362520' },
  { city: 'Daman', zipCode: '396210' }
];

const Checkout = ({ cartItems, totalAmount, onClose, onOrderComplete }) => {
  const sessionId = localStorage.getItem('sessionId');
  const [step, setStep] = useState('details'); // 'details' -> 'payment' -> 'confirmation'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('gpay');
  const [qrValue, setQrValue] = useState('');
  const [orderId, setOrderId] = useState('');
  
  // Dropdown states
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [zipDropdownOpen, setZipDropdownOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState(CITIES_DATA);
  const [filteredZipCodes, setFilteredZipCodes] = useState(CITIES_DATA);
  const cityDropdownRef = useRef(null);
  const zipDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    city: '',
    zipCode: ''
  });

  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  // Generate UPI/GPay QR code
  useEffect(() => {
    if (step === 'payment' && selectedPayment === 'gpay') {
      const upiString = `upi://pay?pa=cijai4u@okicici&pn=VSS-Vault&am=${totalAmount}&tn=VSS-VAULT shop - ${formData.customerName}`;
      setQrValue(upiString);
    }
  }, [step, selectedPayment, totalAmount, formData.customerName]);

  // Pre-fill form data if user is logged in
  useEffect(() => {
    const loggedInUser = getUser();
    if (loggedInUser && loggedInUser.name) {
      setFormData(prev => ({
        ...prev,
        customerName: loggedInUser.name,
        customerEmail: loggedInUser.userName || '' // Using userName as email
      }));
    }
  }, []);

  // Validate email address
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone number (Indian format)
  const validatePhoneNumber = (phone) => {
    // Remove spaces, hyphens, and country code
    const cleaned = phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
    
    // Check if it has exactly 10 digits
    if (!/^\d{10}$/.test(cleaned)) {
      return false;
    }
    
    // Check if first digit is 6, 7, 8, or 9 (valid Indian mobile numbers)
    if (!/^[6-9]/.test(cleaned)) {
      return false;
    }
    
    return true;
  };

  // Handle city search and filter
  const handleCitySearch = (value) => {
    setFormData(prev => ({
      ...prev,
      city: value
    }));
    setCityDropdownOpen(true);
    
    const filtered = CITIES_DATA.filter(item =>
      item.city.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCities(filtered);
  };

  // Handle city selection
  const handleCitySelect = (cityData) => {
    setFormData(prev => ({
      ...prev,
      city: cityData.city,
      zipCode: cityData.zipCode
    }));
    setCityDropdownOpen(false);
  };

  // Handle zip code search and filter
  const handleZipSearch = (value) => {
    setFormData(prev => ({
      ...prev,
      zipCode: value
    }));
    setZipDropdownOpen(true);
    
    const filtered = CITIES_DATA.filter(item =>
      item.zipCode.includes(value) || 
      item.city.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredZipCodes(filtered);
  };

  // Handle zip code selection
  const handleZipSelect = (cityData) => {
    setFormData(prev => ({
      ...prev,
      city: cityData.city,
      zipCode: cityData.zipCode
    }));
    setZipDropdownOpen(false);
  };

  // Handle payment screenshot upload
  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please upload an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB');
        return;
      }

      setPaymentScreenshot(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setMessage('');
    }
  };

  // Remove screenshot
  const handleRemoveScreenshot = () => {
    setPaymentScreenshot(null);
    setScreenshotPreview(null);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
      if (zipDropdownRef.current && !zipDropdownRef.current.contains(event.target)) {
        setZipDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateDetails = () => {
    if (!formData.customerName.trim()) {
      setMessage('Please enter your name');
      return false;
    }
    if (!formData.customerEmail.trim()) {
      setMessage('Please enter your email');
      return false;
    }
    
    // Validate email format
    if (!validateEmail(formData.customerEmail)) {
      setMessage('Please enter a valid email address');
      return false;
    }
    
    // Validate phone number
    if (!formData.customerPhone.trim()) {
      setMessage('Please enter your phone number');
      return false;
    }
    
    if (!validatePhoneNumber(formData.customerPhone)) {
      setMessage('Please enter a valid 10-digit phone number (starting with 6-9)');
      return false;
    }
    
    if (!formData.shippingAddress.trim()) {
      setMessage('Please enter your address');
      return false;
    }
    if (!formData.city.trim()) {
      setMessage('Please enter your city');
      return false;
    }
    if (!formData.zipCode.trim()) {
      setMessage('Please enter your zip code');
      return false;
    }
    return true;
  };

  const handleContinueToPayment = () => {
    setMessage('');
    if (validateDetails()) {
      setStep('payment');
    }
  };

  const handlePaymentSubmit = async () => {
    setLoading(true);
    setMessage('');
    try {
      // Convert screenshot to base64
      let paymentScreenshotBase64 = null;
      if (paymentScreenshot) {
        paymentScreenshotBase64 = screenshotPreview; // Already in base64 format from FileReader
      }

      // Normalize email for consistency
      const normalizedEmail = formData.customerEmail.trim().toLowerCase();

      // Create order
      const response = await createOrder({
        sessionId,
        customerName: formData.customerName,
        customerEmail: normalizedEmail,
        shippingAddress: `${formData.shippingAddress}, ${formData.city} - ${formData.zipCode}`,
        items: cartItems.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount,
        paymentMethod: selectedPayment,
        paymentScreenshot: paymentScreenshotBase64,
        orderDate: new Date().toISOString()
      });

      setOrderId(response.data?.id || response.data?.orderId || 'ORD-' + Date.now());
      setStep('confirmation');
      
      // Call completion callback after showing confirmation
      setTimeout(() => {
        // Call order complete callback first
        if (onOrderComplete) {
          onOrderComplete();
        }
        onClose && onClose();
      }, 3000);
    } catch (err) {
      setMessage('Error processing order: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const qrCanvas = document.querySelector('canvas');
    const url = qrCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-qr-${Date.now()}.png`;
    link.click();
  };

  // Step 1: Customer Details
  if (step === 'details') {
    return (
      <div className="checkout-modal">
        <div className="checkout-container">
          <div className="checkout-header">
            <h2>Shipping Information</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="checkout-content">
            <div className="order-summary-sidebar">
              <h3>Order Summary</h3>
              <div className="order-items">
                {cartItems.map(item => (
                  <div key={item.id} className="order-item">
                    <div className="item-details">
                      <p className="item-name">{item.product_name}</p>
                      <span className="item-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="order-total">
                <h4>Total Amount</h4>
                <p className="total-price">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <form className="checkout-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className={`email-input ${
                      formData.customerEmail && !validateEmail(formData.customerEmail)
                        ? 'invalid'
                        : formData.customerEmail && validateEmail(formData.customerEmail)
                        ? 'valid'
                        : ''
                    }`}
                    required
                  />
                  {formData.customerEmail && !validateEmail(formData.customerEmail) && (
                    <span className="field-error">Invalid email address (e.g., name@example.com)</span>
                  )}
                  {formData.customerEmail && validateEmail(formData.customerEmail) && (
                    <span className="field-success">✓ Valid email</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    placeholder="Enter your 10-digit phone number (e.g., 9876543210)"
                    className={`phone-input ${
                      formData.customerPhone && !validatePhoneNumber(formData.customerPhone)
                        ? 'invalid'
                        : formData.customerPhone && validatePhoneNumber(formData.customerPhone)
                        ? 'valid'
                        : ''
                    }`}
                    required
                  />
                  {formData.customerPhone && !validatePhoneNumber(formData.customerPhone) && (
                    <span className="field-error">Invalid phone number (must be 10 digits, starting with 6-9)</span>
                  )}
                  {formData.customerPhone && validatePhoneNumber(formData.customerPhone) && (
                    <span className="field-success">✓ Valid phone number</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Shipping Address *</label>
                <textarea
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleInputChange}
                  placeholder="Enter your complete address"
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <div className="searchable-dropdown" ref={cityDropdownRef}>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleCitySearch(e.target.value)}
                      onFocus={() => setCityDropdownOpen(true)}
                      placeholder="Search and select city"
                      className="dropdown-input"
                      required
                    />
                    {cityDropdownOpen && filteredCities.length > 0 && (
                      <div className="dropdown-menu">
                        {filteredCities.map((item, index) => (
                          <div
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleCitySelect(item)}
                          >
                            <span className="city-name">{item.city}</span>
                            <span className="zip-hint">{item.zipCode}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {cityDropdownOpen && filteredCities.length === 0 && formData.city && (
                      <div className="dropdown-menu">
                        <div className="dropdown-item-empty">No cities found</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Zip Code *</label>
                  <div className="searchable-dropdown" ref={zipDropdownRef}>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleZipSearch(e.target.value)}
                      onFocus={() => setZipDropdownOpen(true)}
                      placeholder="Search and select zip code"
                      className="dropdown-input"
                      required
                    />
                    {zipDropdownOpen && filteredZipCodes.length > 0 && (
                      <div className="dropdown-menu">
                        {filteredZipCodes.map((item, index) => (
                          <div
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleZipSelect(item)}
                          >
                            <span className="zip-code">{item.zipCode}</span>
                            <span className="city-hint">{item.city}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {zipDropdownOpen && filteredZipCodes.length === 0 && formData.zipCode && (
                      <div className="dropdown-menu">
                        <div className="dropdown-item-empty">No zip codes found</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {message && <div className="error-message">{message}</div>}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleContinueToPayment}
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Payment Method
  if (step === 'payment') {
    return (
      <div className="checkout-modal">
        <div className="checkout-container">
          <div className="checkout-header">
            <h2>Payment Method</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="checkout-content payment-step">
            <div className="payment-options">
              <h3>Select Payment Method</h3>
              
              <div className="payment-method-group">
                <label className={`payment-option ${selectedPayment === 'gpay' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="gpay"
                    checked={selectedPayment === 'gpay'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="payment-icon">🏦</span>
                  <span className="payment-text">Google Pay / UPI</span>
                </label>

                <label className={`payment-option ${selectedPayment === 'card' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="card"
                    checked={selectedPayment === 'card'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="payment-icon">💳</span>
                  <span className="payment-text">Credit / Debit Card</span>
                </label>

                <label className={`payment-option ${selectedPayment === 'upi' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="upi"
                    checked={selectedPayment === 'upi'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="payment-icon">📱</span>
                  <span className="payment-text">UPI Direct</span>
                </label>
              </div>
            </div>

            <div className="qr-code-section">
              {selectedPayment === 'gpay' && qrValue && (
                <div className="qr-container">
                  <h3>Scan to Pay</h3>
                  <p className="qr-note">Scan the QR code with your phone to complete payment</p>
                  <div className="qr-code-box">
                    <QRCode
                      value={qrValue}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={downloadQRCode}
                  >
                    Download QR Code
                  </button>
                </div>
              )}

              {selectedPayment === 'card' && (
                <div className="card-section">
                  <p className="payment-note">Card payments are being processed securely.</p>
                  <p className="payment-info">
                    Your payment information is encrypted and secure.
                  </p>
                </div>
              )}

              {selectedPayment === 'upi' && (
                <div className="upi-section">
                  <p className="payment-note">Open your UPI app and complete the payment.</p>
                  <p className="payment-info">
                    You'll receive a confirmation once payment is received.
                  </p>
                </div>
              )}
            </div>

            <div className="payment-summary">
              <h4>Order Total</h4>
              <p className="total-amount">₹{totalAmount.toFixed(2)}</p>
            </div>

            {/* Payment Screenshot Upload */}
            <div className="screenshot-upload-section">
              <h4>Upload Payment Screenshot</h4>
              <p className="screenshot-note">Please upload a screenshot of your payment confirmation</p>
              
              {!screenshotPreview ? (
                <div className="file-upload-wrapper">
                  <label htmlFor="payment-screenshot" className="file-upload-label">
                    <div className="file-upload-area">
                      <span className="upload-icon">📷</span>
                      <p className="upload-text">Click to upload screenshot</p>
                      <p className="upload-hint">PNG, JPG, up to 5MB</p>
                    </div>
                    <input
                      id="payment-screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="file-input"
                    />
                  </label>
                </div>
              ) : (
                <div className="screenshot-preview-wrapper">
                  <div className="screenshot-preview">
                    <img src={screenshotPreview} alt="Payment screenshot" />
                    <button
                      type="button"
                      className="remove-screenshot-btn"
                      onClick={handleRemoveScreenshot}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="screenshot-uploaded">✓ Screenshot uploaded successfully</p>
                </div>
              )}
            </div>

            {message && <div className="error-message">{message}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('details')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePaymentSubmit}
                disabled={loading || !paymentScreenshot}
              >
                {loading ? 'Processing...' : `Complete Payment`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirmation
  if (step === 'confirmation') {
    return (
      <div className="checkout-modal">
        <div className="checkout-container checkout-confirmation">
          <div className="confirmation-content">
            <div className="success-icon">✓</div>
            <h2>Order Confirmed!</h2>
            <p className="order-number">Order ID: {orderId}</p>
            <p className="confirmation-message">
              Your order has been placed successfully. You will receive a confirmation email shortly.
            </p>
            <div className="confirmation-details">
              <p><strong>Total Paid:</strong> ₹{totalAmount.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> {selectedPayment === 'gpay' ? 'Google Pay/UPI' : selectedPayment}</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onClose && onClose()}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default Checkout;
