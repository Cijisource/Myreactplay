-- Sample data for e-commerce database

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Clothing', 'Apparel and fashion items'),
('Home & Garden', 'Home and garden products'),
('Sports & Outdoors', 'Sports equipment and outdoor gear'),
('Books', 'Books and reading materials');

-- Insert sample products
INSERT INTO products (name, description, category_id, price, stock, sku) VALUES
('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 1, 99.99, 50, 'WH-001'),
('USB-C Cable', 'Durable USB-C charging cable, 2 meters', 1, 12.99, 200, 'UC-001'),
('Cotton T-Shirt', 'Comfortable cotton t-shirt for everyday wear', 2, 19.99, 100, 'CT-001'),
('Denim Jeans', 'Classic blue denim jeans with perfect fit', 2, 49.99, 75, 'DJ-001'),
('LED Desk Lamp', 'Adjustable LED desk lamp with USB charging', 3, 34.99, 40, 'LD-001'),
('Yoga Mat', 'Non-slip yoga mat for fitness and exercise', 4, 29.99, 60, 'YM-001'),
('Running Shoes', 'Professional running shoes for athletes', 4, 79.99, 35, 'RS-001'),
('React Guide', 'Complete guide to learning React development', 5, 39.99, 25, 'BK-001'),
('JavaScript Patterns', 'Design patterns in JavaScript explained', 5, 44.99, 30, 'BK-002'),
('Phone Case', 'Protective phone case for smartphones', 1, 14.99, 150, 'PC-001');

-- Insert sample product images (these will be managed through the app)
-- The app will handle image uploads and linking them to products

-- Insert sample cart items (optional, can be empty initially)
-- INSERT INTO cart_items (cart_session_id, product_id, quantity) VALUES
-- ('session-123', 1, 2),
-- ('session-123', 3, 1);
