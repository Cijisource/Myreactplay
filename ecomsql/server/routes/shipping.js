const express = require('express');
const router = express.Router();

// DTDC and other courier rate matrix for India (approximate 2026 rates)
// Base rates in rupees
const SHIPPING_RATES = {
  // Zones: 0-100km (Local), 100-300km (Regional), 300-500km (State), 500km+ (National)
  local: { baseRate: 40, perKg: 8 },
  regional: { baseRate: 60, perKg: 12 },
  state: { baseRate: 80, perKg: 15 },
  national: { baseRate: 120, perKg: 18 }
};

// Pincode to distance mapping (approximate distances from major hubs)
// This is a simplified version - in production, use actual geocoding
const PINCODE_ZONES = {
  // North India Hub (Delhi - NCR & Haryana)
  '110001': { city: 'New Delhi', zone: 'local', distance: 0 },
  '110002': { city: 'New Delhi', zone: 'local', distance: 5 },
  '110003': { city: 'New Delhi', zone: 'local', distance: 8 },
  '110005': { city: 'New Delhi', zone: 'local', distance: 6 },
  '110006': { city: 'New Delhi', zone: 'local', distance: 7 },
  '110009': { city: 'New Delhi', zone: 'local', distance: 4 },
  '120001': { city: 'Gurgaon', zone: 'local', distance: 25 },
  '120002': { city: 'Gurgaon', zone: 'local', distance: 28 },
  '121001': { city: 'Faridabad', zone: 'local', distance: 30 },
  '121002': { city: 'Faridabad', zone: 'local', distance: 32 },
  '201001': { city: 'Greater Noida', zone: 'regional', distance: 40 },
  '201012': { city: 'Noida', zone: 'regional', distance: 35 },
  '201013': { city: 'Noida', zone: 'regional', distance: 38 },
  '135001': { city: 'Yamunanagar', zone: 'regional', distance: 150 },
  '125001': { city: 'Hisar', zone: 'regional', distance: 165 },
  '124001': { city: 'Rohtak', zone: 'regional', distance: 85 },
  '124002': { city: 'Rohtak', zone: 'regional', distance: 87 },
  '132001': { city: 'Karnal', zone: 'regional', distance: 125 },
  '136027': { city: 'Ambala', zone: 'regional', distance: 180 },
  '147009': { city: 'Mohali', zone: 'regional', distance: 240 },
  '160001': { city: 'Chandigarh', zone: 'regional', distance: 250 },
  '160002': { city: 'Chandigarh', zone: 'regional', distance: 252 },
  '176001': { city: 'Shimla', zone: 'state', distance: 380 },
  '170001': { city: 'Dehradun', zone: 'state', distance: 240 },
  '247001': { city: 'Haldwani', zone: 'state', distance: 310 },
  '245101': { city: 'Meerut', zone: 'regional', distance: 70 },
  '250001': { city: 'Muzaffarnagar', zone: 'regional', distance: 130 },
  '251001': { city: 'Hapur', zone: 'regional', distance: 55 },
  '202001': { city: 'Ghaziabad', zone: 'regional', distance: 30 },
  
  // Punjab & Himachal Pradesh
  '160047': { city: 'Ludhiana', zone: 'state', distance: 350 },
  '160055': { city: 'Amritsar', zone: 'state', distance: 450 },
  '141001': { city: 'Patiala', zone: 'state', distance: 320 },
  '147201': { city: 'Jalandhar', zone: 'state', distance: 380 },
  '175001': { city: 'Kullu', zone: 'state', distance: 420 },
  '171001': { city: 'Solan', zone: 'state', distance: 360 },
  
  // Uttar Pradesh
  '211001': { city: 'Varanasi', zone: 'state', distance: 780 },
  '226001': { city: 'Lucknow', zone: 'state', distance: 620 },
  '208001': { city: 'Kanpur', zone: 'state', distance: 550 },
  '207001': { city: 'Jhansi', zone: 'state', distance: 480 },
  '250001': { city: 'Agra', zone: 'state', distance: 370 },
  '281001': { city: 'Etah', zone: 'regional', distance: 200 },
  '285001': { city: 'Mathura', zone: 'regional', distance: 180 },
  
  // South India Hub (Bangalore & Tamil Nadu)
  '560001': { city: 'Bangalore', zone: 'local', distance: 0 },
  '560002': { city: 'Bangalore', zone: 'local', distance: 10 },
  '560004': { city: 'Bangalore', zone: 'local', distance: 12 },
  '560009': { city: 'Bangalore', zone: 'local', distance: 15 },
  '560011': { city: 'Bangalore', zone: 'local', distance: 8 },
  '570001': { city: 'Mysore', zone: 'state', distance: 150 },
  '571001': { city: 'Mysore', zone: 'state', distance: 160 },
  '575001': { city: 'Mangalore', zone: 'state', distance: 400 },
  '575002': { city: 'Mangalore', zone: 'state', distance: 405 },
  '591001': { city: 'Belgaum', zone: 'state', distance: 380 },
  '577201': { city: 'Chikmagalur', zone: 'state', distance: 280 },
  
  // Tamil Nadu Cities
  '600001': { city: 'Chennai', zone: 'regional', distance: 550 },
  '600002': { city: 'Chennai', zone: 'regional', distance: 552 },
  '600003': { city: 'Chennai', zone: 'regional', distance: 553 },
  '600004': { city: 'Chennai', zone: 'regional', distance: 551 },
  '603202': { city: 'Koyambedu', zone: 'state', distance: 200 },
  '605602': { city: 'Villupuram', zone: 'state', distance: 240 },
  '607001': { city: 'Cuddalore', zone: 'state', distance: 320 },
  '607002': { city: 'Cuddalore', zone: 'state', distance: 325 },
  '609001': { city: 'Chengalpattu', zone: 'state', distance: 180 },
  '609602': { city: 'Mahabalipuram', zone: 'state', distance: 220 },
  '620001': { city: 'Tiruchirappalli', zone: 'state', distance: 410 },
  '620002': { city: 'Tiruchirappalli', zone: 'state', distance: 412 },
  '620018': { city: 'Tiruchirappalli', zone: 'state', distance: 415 },
  '621001': { city: 'Ariyalur', zone: 'state', distance: 440 },
  '624001': { city: 'Dindigul', zone: 'state', distance: 320 },
  '624003': { city: 'Dindigul', zone: 'state', distance: 325 },
  '624403': { city: 'Palani', zone: 'state', distance: 210 },
  '624405': { city: 'Palani', zone: 'state', distance: 215 },
  '624507': { city: 'Oddanchatram', zone: 'state', distance: 240 },
  '625001': { city: 'Madurai', zone: 'state', distance: 420 },
  '625002': { city: 'Madurai', zone: 'state', distance: 422 },
  '625003': { city: 'Madurai', zone: 'state', distance: 421 },
  '625523': { city: 'Sivakasi', zone: 'state', distance: 450 },
  '625526': { city: 'Sivakasi', zone: 'state', distance: 455 },
  '625532': { city: 'Virudunagar', zone: 'state', distance: 480 },
  '626123': { city: 'Tirunelveli', zone: 'state', distance: 580 },
  '626001': { city: 'Tirunelveli', zone: 'state', distance: 575 },
  '626002': { city: 'Tirunelveli', zone: 'state', distance: 578 },
  '628001': { city: 'Thoothukudi', zone: 'state', distance: 600 },
  '628002': { city: 'Thoothukudi', zone: 'state', distance: 605 },
  '629001': { city: 'Nagercoil', zone: 'state', distance: 630 },
  '629002': { city: 'Nagercoil', zone: 'state', distance: 635 },
  '629702': { city: 'Kanya Kumari', zone: 'national', distance: 680 },
  '630001': { city: 'Karaikudi', zone: 'state', distance: 480 },
  '630001': { city: 'Ramanathapuram', zone: 'state', distance: 520 },
  '631001': { city: 'Kanchipuram', zone: 'state', distance: 280 },
  '631002': { city: 'Kanchipuram', zone: 'state', distance: 285 },
  '631501': { city: 'Mahabalipuram', zone: 'state', distance: 220 },
  '632001': { city: 'Vellore', zone: 'state', distance: 260 },
  '632002': { city: 'Vellore', zone: 'state', distance: 265 },
  '632401': { city: 'Ranipet', zone: 'state', distance: 270 },
  '632402': { city: 'Ranipet', zone: 'state', distance: 275 },
  '632507': { city: 'Chittoor', zone: 'state', distance: 300 },
  '636001': { city: 'Salem', zone: 'state', distance: 300 },
  '636002': { city: 'Salem', zone: 'state', distance: 305 },
  '636103': { city: 'Attur', zone: 'state', distance: 320 },
  '638001': { city: 'Erode', zone: 'state', distance: 340 },
  '638002': { city: 'Erode', zone: 'state', distance: 345 },
  '638103': { city: 'Nambiyur', zone: 'state', distance: 360 },
  '640001': { city: 'Coonoor', zone: 'state', distance: 350 },
  '641001': { city: 'Coimbatore', zone: 'state', distance: 380 },
  '641002': { city: 'Coimbatore', zone: 'state', distance: 385 },
  '641003': { city: 'Coimbatore', zone: 'state', distance: 382 },
  '641602': { city: 'Tiruppur', zone: 'state', distance: 360 },
  '641603': { city: 'Tiruppur', zone: 'state', distance: 365 },
  '642001': { city: 'Pollachi', zone: 'state', distance: 390 },
  '642113': { city: 'Valparai', zone: 'state', distance: 420 },
  
  // Andhra Pradesh & Telangana
  '500001': { city: 'Hyderabad', zone: 'state', distance: 600 },
  '500002': { city: 'Hyderabad', zone: 'state', distance: 605 },
  '501001': { city: 'Secunderabad', zone: 'state', distance: 610 },
  '517001': { city: 'Tirupati', zone: 'state', distance: 350 },
  '517501': { city: 'Tirupati', zone: 'state', distance: 360 },
  '517502': { city: 'Tirupati', zone: 'state', distance: 365 },
  '518001': { city: 'Kurnool', zone: 'state', distance: 290 },
  '518002': { city: 'Kurnool', zone: 'state', distance: 295 },
  '520001': { city: 'Vijayawada', zone: 'state', distance: 550 },
  '520002': { city: 'Vijayawada', zone: 'state', distance: 555 },
  '521001': { city: 'Visakhapatnam', zone: 'national', distance: 800 },
  '530001': { city: 'Visakhapatnam', zone: 'national', distance: 805 },
  '530003': { city: 'Visakhapatnam', zone: 'national', distance: 810 },
  '522001': { city: 'Guntur', zone: 'state', distance: 520 },
  '524001': { city: 'Nellore', zone: 'state', distance: 380 },
  '524002': { city: 'Nellore', zone: 'state', distance: 385 },
  
  // East India Hub (Kolkata & surroundings)
  '700001': { city: 'Kolkata', zone: 'local', distance: 0 },
  '700002': { city: 'Kolkata', zone: 'local', distance: 5 },
  '700003': { city: 'Kolkata', zone: 'local', distance: 3 },
  '700004': { city: 'Kolkata', zone: 'local', distance: 4 },
  '700005': { city: 'Kolkata', zone: 'local', distance: 6 },
  '700006': { city: 'Kolkata', zone: 'local', distance: 8 },
  '700007': { city: 'Kolkata', zone: 'local', distance: 7 },
  '700009': { city: 'Kolkata', zone: 'local', distance: 2 },
  '700020': { city: 'Kolkata', zone: 'local', distance: 10 },
  '700115': { city: 'Howrah', zone: 'local', distance: 15 },
  '800001': { city: 'Patna', zone: 'regional', distance: 200 },
  '800002': { city: 'Patna', zone: 'regional', distance: 205 },
  '800003': { city: 'Patna', zone: 'regional', distance: 208 },
  '800020': { city: 'Patna', zone: 'regional', distance: 210 },
  '802145': { city: 'Begusarai', zone: 'state', distance: 280 },
  '823001': { city: 'Gaya', zone: 'state', distance: 240 },
  '824001': { city: 'Arrah', zone: 'state', distance: 320 },
  '825301': { city: 'Munger', zone: 'state', distance: 240 },
  '834001': { city: 'Ranchi', zone: 'state', distance: 250 },
  '834002': { city: 'Ranchi', zone: 'state', distance: 255 },
  '829001': { city: 'Dhanbad', zone: 'state', distance: 280 },
  '829129': { city: 'Asansol', zone: 'state', distance: 200 },
  '846001': { city: 'Darbhanga', zone: 'state', distance: 380 },
  '846002': { city: 'Darbhanga', zone: 'state', distance: 385 },
  '847101': { city: 'Madhubani', zone: 'state', distance: 420 },
  '841301': { city: 'Motihari', zone: 'state', distance: 460 },
  '842001': { city: 'Muzaffarpur', zone: 'state', distance: 360 },
  
  // Odisha
  '751001': { city: 'Bhubaneswar', zone: 'state', distance: 320 },
  '751002': { city: 'Bhubaneswar', zone: 'state', distance: 325 },
  '751003': { city: 'Bhubaneswar', zone: 'state', distance: 328 },
  '751009': { city: 'Bhubaneswar', zone: 'state', distance: 330 },
  '752101': { city: 'Cuttack', zone: 'state', distance: 340 },
  '770001': { city: 'Rourkela', zone: 'state', distance: 480 },
  '771001': { city: 'Sambalpur', zone: 'state', distance: 520 },
  '753001': { city: 'Berhampur', zone: 'state', distance: 420 },
  
  // West India Hub (Mumbai & surroundings)
  '400001': { city: 'Mumbai', zone: 'local', distance: 0 },
  '400002': { city: 'Mumbai', zone: 'local', distance: 8 },
  '400003': { city: 'Mumbai', zone: 'local', distance: 5 },
  '400004': { city: 'Mumbai', zone: 'local', distance: 6 },
  '400005': { city: 'Mumbai', zone: 'local', distance: 4 },
  '400006': { city: 'Mumbai', zone: 'local', distance: 10 },
  '400007': { city: 'Mumbai', zone: 'local', distance: 7 },
  '400008': { city: 'Mumbai', zone: 'local', distance: 12 },
  '400009': { city: 'Mumbai', zone: 'local', distance: 9 },
  '400014': { city: 'Mumbai', zone: 'local', distance: 12 },
  '400026': { city: 'Mumbai', zone: 'local', distance: 15 },
  '400050': { city: 'Mumbai', zone: 'local', distance: 20 },
  '400701': { city: 'Navi Mumbai', zone: 'local', distance: 30 },
  '400702': { city: 'Navi Mumbai', zone: 'local', distance: 35 },
  '421201': { city: 'Thane', zone: 'local', distance: 40 },
  '421202': { city: 'Thane', zone: 'local', distance: 45 },
  '410201': { city: 'Pune', zone: 'regional', distance: 150 },
  '410202': { city: 'Pune', zone: 'regional', distance: 155 },
  '410203': { city: 'Pune', zone: 'regional', distance: 158 },
  '422001': { city: 'Nashik', zone: 'regional', distance: 200 },
  '422002': { city: 'Nashik', zone: 'regional', distance: 205 },
  '425001': { city: 'Jalgaon', zone: 'regional', distance: 330 },
  '425002': { city: 'Jalgaon', zone: 'regional', distance: 335 },
  '431001': { city: 'Aurangabad', zone: 'state', distance: 380 },
  '431002': { city: 'Aurangabad', zone: 'state', distance: 385 },
  
  // Gujarat
  '380001': { city: 'Ahmedabad', zone: 'state', distance: 480 },
  '380002': { city: 'Ahmedabad', zone: 'state', distance: 485 },
  '380003': { city: 'Ahmedabad', zone: 'state', distance: 488 },
  '380004': { city: 'Ahmedabad', zone: 'state', distance: 490 },
  '382001': { city: 'Gandhinagar', zone: 'state', distance: 510 },
  '390001': { city: 'Vadodara', zone: 'state', distance: 380 },
  '390002': { city: 'Vadodara', zone: 'state', distance: 385 },
  '393001': { city: 'Bharuch', zone: 'state', distance: 420 },
  '395001': { city: 'Surat', zone: 'state', distance: 260 },
  '395002': { city: 'Surat', zone: 'state', distance: 265 },
  '395003': { city: 'Surat', zone: 'state', distance: 268 },
  '396001': { city: 'Vapi', zone: 'state', distance: 320 },
  '360001': { city: 'Rajkot', zone: 'state', distance: 580 },
  '360002': { city: 'Rajkot', zone: 'state', distance: 585 },
  '364001': { city: 'Bhavnagar', zone: 'state', distance: 520 },
  '362001': { city: 'Porbandar', zone: 'state', distance: 600 },
  '370001': { city: 'Jamnagar', zone: 'state', distance: 550 },
  
  // Rajasthan
  '302001': { city: 'Jaipur', zone: 'state', distance: 260 },
  '302002': { city: 'Jaipur', zone: 'state', distance: 265 },
  '302003': { city: 'Jaipur', zone: 'state', distance: 268 },
  '334001': { city: 'Bikaner', zone: 'state', distance: 480 },
  '345001': { city: 'Jodhpur', zone: 'state', distance: 560 },
  '306001': { city: 'Ajmer', zone: 'state', distance: 380 },
  '313001': { city: 'Udaipur', zone: 'state', distance: 520 },
  '324001': { city: 'Bhilwara', zone: 'state', distance: 440 },
  
  // Central India Hub (Indore & surroundings)
  '452001': { city: 'Indore', zone: 'local', distance: 0 },
  '452002': { city: 'Indore', zone: 'local', distance: 5 },
  '452003': { city: 'Indore', zone: 'local', distance: 8 },
  '452004': { city: 'Indore', zone: 'local', distance: 10 },
  '456001': { city: 'Ujjain', zone: 'regional', distance: 55 },
  '458001': { city: 'Mandsaur', zone: 'regional', distance: 120 },
  '440001': { city: 'Nagpur', zone: 'regional', distance: 480 },
  '440002': { city: 'Nagpur', zone: 'regional', distance: 485 },
  '441001': { city: 'Wardha', zone: 'state', distance: 520 },
  '443001': { city: 'Amravati', zone: 'state', distance: 580 },
  '445001': { city: 'Akola', zone: 'state', distance: 600 },
  '482001': { city: 'Jabalpur', zone: 'state', distance: 380 },
  '482002': { city: 'Jabalpur', zone: 'state', distance: 385 },
  '486001': { city: 'Satna', zone: 'state', distance: 420 },
  '462001': { city: 'Bhopal', zone: 'regional', distance: 310 },
  '462002': { city: 'Bhopal', zone: 'regional', distance: 315 },
  '473001': { city: 'Gwalior', zone: 'state', distance: 520 },
  '492001': { city: 'Raipur', zone: 'state', distance: 400 },
  '492002': { city: 'Raipur', zone: 'state', distance: 405 },
  '495201': { city: 'Durg', zone: 'state', distance: 420 },
};

// Get shipping rate by pincode
router.get('/rate/:pincode', (req, res) => {
  try {
    const { pincode } = req.params;
    const weight = parseFloat(req.query.weight) || 1; // Default 1 kg

    // Get zone info for pincode
    let zoneInfo = PINCODE_ZONES[pincode];
    
    if (!zoneInfo) {
      // Default to national zone if pincode not found
      console.warn(`[SHIPPING] Pincode ${pincode} not found in mapping, using national zone`);
      zoneInfo = { city: 'Unknown', zone: 'national', distance: 600 };
    }

    const rateStructure = SHIPPING_RATES[zoneInfo.zone];
    const shippingCharge = rateStructure.baseRate + (rateStructure.perKg * weight);

    // Apply free shipping for orders above ₹5000
    const totalOrder = parseFloat(req.query.totalOrder) || 0;
    const finalShippingCharge = totalOrder >= 5000 ? 0 : shippingCharge;

    res.json({
      success: true,
      pincode,
      city: zoneInfo.city,
      zone: zoneInfo.zone,
      distance: zoneInfo.distance,
      weight,
      baseRate: rateStructure.baseRate,
      perKgRate: rateStructure.perKg,
      calculatedCharge: shippingCharge,
      shippingCharge: finalShippingCharge,
      isFreeShipping: totalOrder >= 5000,
      freeShippingThreshold: 5000,
      note: 'Shipping rates from DTDC partners network'
    });
  } catch (error) {
    console.error('[SHIPPING] Error calculating shipping rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate shipping rate',
      details: error.message
    });
  }
});

// Get shipping rate by city
router.get('/rate-by-city/:city', (req, res) => {
  try {
    const { city } = req.params;
    const weight = parseFloat(req.query.weight) || 1;
    const totalOrder = parseFloat(req.query.totalOrder) || 0;

    // Find first matching pincode for city
    const pincodeEntry = Object.entries(PINCODE_ZONES).find(
      ([, data]) => data.city.toLowerCase() === city.toLowerCase()
    );

    if (!pincodeEntry) {
      // Default to national zone
      const rateStructure = SHIPPING_RATES['national'];
      const shippingCharge = rateStructure.baseRate + (rateStructure.perKg * weight);
      const finalShippingCharge = totalOrder >= 5000 ? 0 : shippingCharge;

      return res.json({
        success: true,
        city,
        zone: 'national',
        weight,
        shippingCharge: finalShippingCharge,
        isFreeShipping: totalOrder >= 5000,
        freeShippingThreshold: 5000,
        note: 'Default national rate applied'
      });
    }

    const [pincode, zoneInfo] = pincodeEntry;
    const rateStructure = SHIPPING_RATES[zoneInfo.zone];
    const shippingCharge = rateStructure.baseRate + (rateStructure.perKg * weight);
    const finalShippingCharge = totalOrder >= 5000 ? 0 : shippingCharge;

    res.json({
      success: true,
      city,
      pincode,
      zone: zoneInfo.zone,
      distance: zoneInfo.distance,
      weight,
      shippingCharge: finalShippingCharge,
      isFreeShipping: totalOrder >= 5000,
      freeShippingThreshold: 5000,
      note: 'Shipping rates from DTDC partners network'
    });
  } catch (error) {
    console.error('[SHIPPING] Error calculating shipping rate by city:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate shipping rate',
      details: error.message
    });
  }
});

// Get location from IP (using ipapi.co - free service)
router.get('/location-from-ip', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
    
    // For local development, return a default location
    if (clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp.includes('localhost')) {
      console.log('[SHIPPING] Local IP detected, returning default location');
      return res.json({
        success: true,
        city: 'Bangalore',
        pincode: '560001',
        country: 'India',
        source: 'local',
        note: 'Local development - using default Bangalore location'
      });
    }

    console.log('[SHIPPING] Detected client IP:', clientIp);
    
    // Call ipapi.co for geolocation (free, no auth required)
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://ipapi.co/${clientIp}/json/`, {
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const locationData = await response.json();

    // Map country to check if India
    if (locationData.country_code !== 'IN') {
      console.warn('[SHIPPING] User is not from India, returning Mumbai as default');
      return res.json({
        success: true,
        city: 'Mumbai',
        pincode: '400001',
        country: locationData.country,
        source: 'default',
        note: 'Default India location - user appears to be outside India'
      });
    }

    // Try to find matching city in PINCODE_ZONES
    const matchingPincode = Object.entries(PINCODE_ZONES).find(
      ([, data]) => data.city.toLowerCase().includes(locationData.city?.toLowerCase() || '')
    );

    if (matchingPincode) {
      return res.json({
        success: true,
        city: locationData.city,
        pincode: matchingPincode[0],
        country: locationData.country,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        source: 'ip-geolocation',
        note: 'Location detected from IP address'
      });
    }

    // Fallback to Mumbai if city not found
    res.json({
      success: true,
      city: locationData.city || 'Mumbai',
      pincode: '400001',
      country: locationData.country,
      source: 'partial',
      note: 'City detected but using default pincode'
    });
  } catch (error) {
    console.error('[SHIPPING] Error detecting location from IP:', error);
    // Fallback to Mumbai
    res.json({
      success: true,
      city: 'Mumbai',
      pincode: '400001',
      country: 'India',
      source: 'fallback',
      note: 'Geolocation failed - using default location'
    });
  }
});

// Get available cities
router.get('/cities', (req, res) => {
  try {
    const cities = [...new Set(Object.values(PINCODE_ZONES).map(data => data.city))].sort();
    res.json({
      success: true,
      cities,
      total: cities.length
    });
  } catch (error) {
    console.error('[SHIPPING] Error fetching cities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cities'
    });
  }
});

module.exports = router;
