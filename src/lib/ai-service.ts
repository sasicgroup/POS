
// Mock AI Service for Store Management
// In a real application, this would interface with a Python backend (FastAPI/Flask) running ML models (Prophet, TensorFlow, etc.)

export interface DemandForecast {
    date: string;
    predictedSales: number;
    upperBound: number;
    lowerBound: number;
    factors: string[]; // e.g., "Holiday", "Weather: Sunny"
}

export interface InventoryInsight {
    productId: number;
    type: 'reorder' | 'overstock' | 'slow_moving';
    confidence: number;
    message: string;
    predictedStockoutDate?: string;
}

export interface CustomerRecommendation {
    customerId: number;
    segment: 'Price Sensitive' | 'Big Spender' | 'Loyalist' | 'Risk of Churn';
    recommendedProducts: string[];
    nextAction: string; // e.g., "Send discount coupon", "Offer membership upgrade"
}

/**
 * Predicts future demand based on simple mock linear regression + seasonality
 */
export const getDemandForecast = (days = 30): DemandForecast[] => {
    const today = new Date();
    const forecast: DemandForecast[] = [];

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        // Mock prediction logic: Base + Random Trend + Weekly Seasonality
        let base = 5000;
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) base += 2000; // Weekend bump

        // Add some noise
        const noise = Math.random() * 1000 - 500;

        const predicted = Math.round(base + noise);

        forecast.push({
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            predictedSales: predicted,
            upperBound: predicted + 500,
            lowerBound: predicted - 500,
            factors: dayOfWeek === 5 ? ['Payday Weekend'] : ['Normal Trend']
        });
    }
    return forecast;
};

/**
 * Analyzes inventory to find inefficiencies
 */
export const getInventoryInsights = (products: any[]): InventoryInsight[] => {
    return products.map(p => {
        // Mock logic
        if (p.stock < 10) {
            return {
                productId: p.id,
                type: 'reorder',
                confidence: 0.95,
                message: 'High turnover detected. Reorder immediately to avoid stockout.',
                predictedStockoutDate: '2 days'
            };
        } else if (p.stock > 100 && p.sku.startsWith('APP')) {
            return {
                productId: p.id,
                type: 'slow_moving',
                confidence: 0.82,
                message: 'Sales velocity is low. Consider a 15% discount promotion.',
            };
        }
        return null;
    }).filter(Boolean) as InventoryInsight[];
};

/**
 * Generates personalized recommendations for a customer
 */
export const getCustomerInsights = (customerId: number): CustomerRecommendation => {
    // Deterministic mock based on ID
    const segments: CustomerRecommendation['segment'][] = ['Big Spender', 'Loyalist', 'Price Sensitive', 'Risk of Churn'];
    const segment = segments[customerId % segments.length];

    let recommendedProducts = [];
    let nextAction = '';

    switch (segment) {
        case 'Big Spender':
            recommendedProducts = ['Premium Leather Bag', 'Gold Watch'];
            nextAction = 'Offer VIP Concierge Service';
            break;
        case 'Loyalist':
            recommendedProducts = ['New Arrivals', 'Gift Card'];
            nextAction = 'Send "Thank You" personal note';
            break;
        case 'Price Sensitive':
            recommendedProducts = ['Clearance Items', 'Bundle Deal'];
            nextAction = 'Send 10% Discount Code';
            break;
        case 'Risk of Churn':
            recommendedProducts = ['Best Sellers'];
            nextAction = 'Re-engagement Campaign via SMS';
            break;
    }

    return {
        customerId,
        segment,
        recommendedProducts,
        nextAction
    };
};

export const getBusinessInsights = () => {
    return [
        { title: 'Revenue Opportunity', impact: 'High', description: 'Weekend weather forecast is sunny. Expect 20% foot traffic increase. Staff up accordingly.' },
        { title: 'Cost Saving', impact: 'Medium', description: '3 apparel items are slow-moving. Mark down by 15% to free up cash flow.' },
        { title: 'Customer Retention', impact: 'High', description: '5 VIP customers haven\'t visited in 30 days. Automated SMS scheduled.' }
    ];
};
