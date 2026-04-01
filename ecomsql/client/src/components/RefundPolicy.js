import React from 'react';
import { Link } from 'react-router-dom';
import './RefundPolicy.css';

const RefundPolicy = () => (
  <div className="refund-policy-page">
    <header className="refund-page-header">
      <div className="refund-header-inner">
        <Link to="/" className="refund-brand">🛒 VSS-Vault</Link>
        <Link to="/" className="refund-back-link">← Back to Shop</Link>
      </div>
    </header>
  <div className="refund-policy-container">
    <h1>Refund & Return Policy</h1>
    <p>
      Thank you for shopping with us! We take great pride in our curated collection of stationery and accessories. Please read our policy below regarding returns and refunds.
    </p>
    <h2>1. Return Window</h2>
    <p>
      Items can be returned or exchanged within <strong>2 days of delivery</strong>. To be eligible for a return, your item must be unused, in the same condition that you received it, and in its original packaging.
    </p>
    <h2>2. Non-Returnable Items</h2>
    <p>To maintain hygiene and quality standards, the following items cannot be returned:</p>
    <ul>
      <li><strong>Earrings and hair accessories</strong> (for hygiene reasons).</li>
      <li>Items on clearance or marked as "Final Sale."</li>
      <li>Personalized or custom-ordered products.</li>
    </ul>
    <h2>3. Damages and Issues</h2>
    <p>
      Please inspect your order upon reception. If the item is defective, damaged, or if you receive the wrong item, contact us immediately at [Insert Email/Phone] so that we can evaluate the issue and make it right.
    </p>
    <p>
      <em>Note: We may require a short video of the unboxing to process damage claims.</em>
    </p>
    <h2>4. Refund Process</h2>
    <p>
      Once we receive and inspect your return, we will notify you of the approval or rejection of your refund.
    </p>
    <ul>
      <li><strong>Approved Refunds:</strong> The amount will be automatically refunded to your original payment method within 5–7 business days.</li>
      <li><strong>Shipping Costs:</strong> Please note that original shipping charges are non-refundable, and customers are responsible for return shipping costs unless the item arrived damaged.</li>
    </ul>
    <h2>5. Exchanges</h2>
    <p>
      The fastest way to ensure you get what you want is to return the item you have, and once the return is accepted, make a separate purchase for the new item.
    </p>
    </div>
</div>
);

export default RefundPolicy;
