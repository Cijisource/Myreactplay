#!/bin/bash
# Security Validation Test Suite
# Run this script to verify all security fixes are in place

echo "================================"
echo "Security Validation Test Suite"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

# Test 1: Check Node.js packages
test_npm_packages() {
  echo -n "Test 1: Checking npm package versions..."
  
  cd backend 2>/dev/null
  if npm list express 2>/dev/null | grep -q "4.19.2"; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (express version incorrect)"
    ((failed++))
  fi
  cd ..
}

# Test 2: Check security middleware in server.js
test_security_middleware() {
  echo -n "Test 2: Checking security middleware..."
  
  if grep -q "helmet" backend/src/server.js && \
     grep -q "xss-clean" backend/src/server.js && \
     grep -q "rateLimit" backend/src/server.js && \
     grep -q "contentSecurityPolicy" backend/src/server.js; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (missing security middleware)"
    ((failed++))
  fi
}

# Test 3: Check file upload validation
test_file_upload_validation() {
  echo -n "Test 3: Checking file upload validation..."
  
  if grep -q "ALLOWED_MIMES" backend/src/routes/upload.js && \
     grep -q "MAX_FILE_SIZE" backend/src/routes/upload.js && \
     grep -q "fileFilter" backend/src/routes/upload.js; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (missing file validation)"
    ((failed++))
  fi
}

# Test 4: Check input validation in products.js
test_products_validation() {
  echo -n "Test 4: Checking product input validation..."
  
  if grep -q "validateProductInput" backend/src/routes/products.js; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (missing product validation)"
    ((failed++))
  fi
}

# Test 5: Check search query validation
test_search_validation() {
  echo -n "Test 5: Checking search input validation..."
  
  if grep -q "sanitizeSearchInput" backend/src/routes/search.js; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (missing search validation)"
    ((failed++))
  fi
}

# Test 6: Check cart validation
test_cart_validation() {
  echo -n "Test 6: Checking cart validation helpers..."
  
  if grep -q "validateSessionId\|validateProductId\|validateQuantity" backend/src/routes/cart.js; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (missing cart validation)"
    ((failed++))
  fi
}

# Test 7: Check orders validation
test_orders_validation() {
  echo -n "Test 7: Checking order validation helpers..."
  
  if grep -q "validateEmail\|validateCustomerName" backend/src/routes/orders.js; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (missing order validation)"
    ((failed++))
  fi
}

# Test 8: Check package.json for rate limit package
test_rate_limit_package() {
  echo -n "Test 8: Checking rate-limit package..."
  
  if grep -q "express-rate-limit" backend/package.json; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (express-rate-limit not in package.json)"
    ((failed++))
  fi
}

# Test 9: Check frontend security packages
test_frontend_security() {
  echo -n "Test 9: Checking frontend security packages..."
  
  if grep -q "dompurify" frontend/package.json; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (dompurify not in frontend package.json)"
    ((failed++))
  fi
}

# Test 10: Check SECURITY documentation exists
test_security_docs() {
  echo -n "Test 10: Checking security documentation..."
  
  if [ -f "SECURITY.md" ] && [ -f "SECURITY_COMPLETION.md" ]; then
    echo -e " ${GREEN}✓ PASS${NC}"
    ((passed++))
  else
    echo -e " ${RED}✗ FAIL${NC} (security documentation missing)"
    ((failed++))
  fi
}

# Run all tests
test_npm_packages
test_security_middleware
test_file_upload_validation
test_products_validation
test_search_validation
test_cart_validation
test_orders_validation
test_rate_limit_package
test_frontend_security
test_security_docs

# Print summary
echo ""
echo "================================"
echo "Test Results Summary:"
echo "================================"
echo -e "Tests Passed: ${GREEN}${passed}${NC}"
echo -e "Tests Failed: ${RED}${failed}${NC}"
echo "Total Tests:  10"

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}✓ All security tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review.${NC}"
  exit 1
fi
