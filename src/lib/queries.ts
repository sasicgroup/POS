// React Query Hooks - Centralized Export
// Import these hooks instead of using contexts for better performance

export { useProducts } from './use-products-query';
export { useSales } from './use-sales-query';
export { useCustomers } from './use-customers-query';
export { useEmployees } from './use-employees-query';
export { useExpenses } from './use-expenses-query';
export { useDashboardStats } from './use-dashboard-query';
export { useNotifications } from './notifications-context';

/**
 * Usage Example:
 * 
 * import { useProducts, useCustomers } from '@/lib/queries';
 * 
 * function MyComponent() {
 *   const { products, isLoading, addProduct } = useProducts();
 *   const { customers } = useCustomers();
 *   
 *   // All data is automatically cached and optimized!
 * }
 */
