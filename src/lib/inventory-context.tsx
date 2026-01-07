'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Product {
    id: number;
    name: string;
    sku: string;
    category: string;
    stock: number;
    price: number;
    costPrice?: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    image: string;
    video?: string;
}

interface InventoryContextType {
    products: Product[];
    addProduct: (product: Omit<Product, 'id'>) => void;
    deleteProduct: (id: number) => void;
    updateStock: (id: number, newStock: number) => void;
    processSale: (items: { id: number; quantity: number }[]) => void;
    businessTypes: string[];
    activeCategories: string[];
    customCategories: string[];
    toggleBusinessType: (type: string) => void;
    addCustomCategory: (category: string) => void;
    removeCustomCategory: (category: string) => void;
    availableBusinessTypes: string[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
    const [products, setProducts] = useState<Product[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('inventory_products');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 1, name: 'Premium Leather Bag', sku: 'ACC-001', category: 'Accessories', stock: 45, price: 120.00, costPrice: 80.00, status: 'In Stock', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7' },
            { id: 2, name: 'Slim Fit Denim Jeans', sku: 'APP-004', category: 'Apparel', stock: 12, price: 49.99, costPrice: 25.00, status: 'Low Stock', image: 'https://images.unsplash.com/photo-1542272617-08f086303294' },
            { id: 3, name: 'Classic White T-Shirt', sku: 'APP-009', category: 'Apparel', stock: 156, price: 19.99, costPrice: 8.00, status: 'In Stock', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab' },
            { id: 4, name: 'Running Sneakers', sku: 'FTW-021', category: 'Footwear', stock: 0, price: 89.95, costPrice: 45.00, status: 'Out of Stock', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff' },
            { id: 5, name: 'Silver Wrist Watch', sku: 'ACC-005', category: 'Accessories', stock: 8, price: 299.00, costPrice: 150.00, status: 'Low Stock', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314' },
            { id: 6, name: 'Sunglasses', sku: 'ACC-012', category: 'Accessories', stock: 25, price: 150.00, costPrice: 60.00, status: 'In Stock', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083' },
        ];
    });

    React.useEffect(() => {
        localStorage.setItem('inventory_products', JSON.stringify(products));
    }, [products]);

    // Category Management
    const PRESET_CATEGORIES: Record<string, string[]> = {
        'Retail (General)': ['Apparel', 'Accessories', 'Footwear', 'Consumer Electronics'],
        'Construction': ['Cement', 'Sand & Stone', 'Steel', 'Tools', 'Plumbing', 'Electricals', 'Paints'],
        'Electricals': ['Cables & Wires', 'Lighting', 'Switches', 'Circuit Breakers', 'Batteries'],
        'Home Appliances': ['Kitchen', 'Laundry', 'Air Conditioning', 'TV & Audio', 'Refrigeration'],
        'Pharmacy': ['Medicines', 'Personal Care', 'Baby Care', 'Vitamins', 'First Aid'],
        'Grocery': ['Produce', 'Dairy', 'Beverages', 'Bakery', 'Canned Goods', 'Snacks'],
        'Automotive': ['Spare Parts', 'Oil & Fluids', 'Tires', 'Car Care', 'Tools'],
    };

    const [businessTypes, setBusinessTypes] = useState<string[]>(['Retail (General)']);
    const [customCategories, setCustomCategories] = useState<string[]>([]);

    const activeCategories = Array.from(new Set([
        ...businessTypes.flatMap(type => PRESET_CATEGORIES[type] || []),
        ...customCategories
    ])).sort();

    const toggleBusinessType = (type: string) => {
        setBusinessTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const addCustomCategory = (category: string) => {
        if (!customCategories.includes(category)) {
            setCustomCategories(prev => [...prev, category]);
        }
    };

    const removeCustomCategory = (category: string) => {
        setCustomCategories(prev => prev.filter(c => c !== category));
    };

    const addProduct = (product: Omit<Product, 'id'>) => {
        setProducts(prev => [
            ...prev,
            { ...product, id: Math.max(0, ...prev.map(p => p.id)) + 1 }
        ]);
    };

    const updateStock = (id: number, newStock: number) => {
        setProducts(prev => prev.map(p => {
            if (p.id === id) {
                const status = newStock === 0 ? 'Out of Stock' : newStock < 10 ? 'Low Stock' : 'In Stock';
                return { ...p, stock: newStock, status };
            }
            return p;
        }));
    };

    const processSale = (items: { id: number; quantity: number }[]) => {
        setProducts(prev => prev.map(p => {
            const saleItem = items.find(i => i.id === p.id);
            if (saleItem) {
                const newStock = Math.max(0, p.stock - saleItem.quantity);
                const status = newStock === 0 ? 'Out of Stock' : newStock < 10 ? 'Low Stock' : 'In Stock';
                return { ...p, stock: newStock, status };
            }
            return p;
        }));
    };

    const deleteProduct = (id: number) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    return (
        <InventoryContext.Provider value={{
            products,
            addProduct,
            deleteProduct,
            updateStock,
            processSale,
            businessTypes,
            activeCategories,
            customCategories,
            toggleBusinessType,
            addCustomCategory,
            removeCustomCategory,
            availableBusinessTypes: Object.keys(PRESET_CATEGORIES)
        }}>
            {children}
        </InventoryContext.Provider>
    );
}

export function useInventory() {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within a InventoryProvider');
    }
    return context;
}
