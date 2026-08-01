# Booking Price Doubling Logic Example

## Formula
When a student books a room:
- **Month 1**: Price = Base Price (e.g., Rp 800,000)
- **Month 2**: Price = Base Price × 2 (Rp 1,600,000)
- **Month 3**: Price = (Base Price × 2) × 2 = Base Price × 4 (Rp 3,200,000)
- **Month 4**: Price = (Base Price × 4) × 2 = Base Price × 8 (Rp 6,400,000)
- And so on...

## Implementation Code
```typescript
// Calculate total based on duration with doubling logic
const calculateTotal = (months: number, basePrice: number) => {
  let total = 0;
  let currentPrice = basePrice;
  for (let i = 0; i < months; i++) {
    total += currentPrice;
    currentPrice *= 2; // Double the price for next month
  }
  return total;
};

// Example calculation for 3 months at Rp 800,000 base price:
// Month 1: 800,000
// Month 2: 1,600,000 (800,000 × 2)
// Month 3: 3,200,000 (1,600,000 × 2)
// Total: 5,600,000

// Breakdown display:
const calculateBreakdown = (months: number, basePrice: number) => {
  const breakdown = [];
  let currentPrice = basePrice;
  for (let i = 0; i < months; i++) {
    breakdown.push(`Bulan ${i + 1}: Rp ${currentPrice.toLocaleString("id-ID")}`);
    currentPrice *= 2;
  }
  return breakdown.join(" + ");
};
```

## Database Storage
When a booking is submitted, we store:
- `base_monthly_price`: The initial price (Rp 800,000)
- `duration_months`: Number of months booked (e.g., 3)
- `total_amount`: Calculated total with doubling logic (Rp 5,600,000 + fees)

## UI Implementation
The booking page now:
1. Shows dropdown with month options (1-12 months)
2. Dynamically calculates total price as user selects duration
3. Displays breakdown calculation for multi-month bookings
4. Submits the calculated total to the database