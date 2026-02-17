import { get, set, del, entries } from 'idb-keyval';
// import { toast } from '@/lib/toast-context'; 
// Cannot use useToast (hook) in a class instance outside React tree.
// Future: use a global event emitter or store dispatch for notifications.
import { supabase } from './supabase';

export interface SyncRequest {
    id: string;
    url?: string; // For REST API
    table?: string; // For Supabase
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC' | 'SALE_TRANSACTION'; // Added SALE_TRANSACTION
    payload: any;
    timestamp: number;
    retryCount: number;
}

const SYNC_QUEUE_KEY = 'sms_offline_queue';

class SyncManager {
    private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
    private isSyncing: boolean = false;
    private listeners: (() => void)[] = [];
    private queueLength: number = 0;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
            // Try to sync on load if online
            if (this.isOnline) {
                this.processQueue();
            } else {
                this.updateQueueLength();
            }
        }
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l());
    }

    getQueueStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            queueLength: this.queueLength
        };
    }

    private async updateQueueLength() {
        if (typeof window === 'undefined') return;
        const allEntries = await entries();
        this.queueLength = allEntries.filter(([key]) => (key as string).startsWith(SYNC_QUEUE_KEY)).length;
        this.notify();
    }

    private handleOnline = () => {
        console.log('App is online. Processing sync queue...');
        this.isOnline = true;
        this.processQueue();
    };

    private handleOffline = () => {
        console.log('App is offline. Requests will be queued.');
        this.isOnline = false;
    };

    /**
     * Add a request to the offline queue
     */
    async enqueueRequest(request: Omit<SyncRequest, 'id' | 'timestamp' | 'retryCount'>) {
        if (this.isOnline) {
            // If online, try to execute immediately (or bypassing queue logic if caller prefers)
            // But this function implies "failed or intentional offline"
            // So we just save it.
        }

        const newRequest: SyncRequest = {
            ...request,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0
        };

        // Persist to IDB
        // Persist to IDB
        await set(`${SYNC_QUEUE_KEY}_${newRequest.id}`, newRequest);
        console.log('[SyncManager] Request queued:', newRequest);
        this.updateQueueLength();

        // Notify user? Maybe via a context or globally
        // For now, silent or console
    }

    /**
     * Process the offline queue
     */
    async processQueue() {
        if (this.isSyncing || !this.isOnline) return;
        this.isSyncing = true;

        try {
            // Get all keys starting with SYNC_QUEUE_KEY
            const allEntries = await entries();
            const queueItems = allEntries
                .filter(([key]) => (key as string).startsWith(SYNC_QUEUE_KEY))
                .map(([_, value]) => value as SyncRequest)
                .sort((a, b) => a.timestamp - b.timestamp);

            if (queueItems.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`[SyncManager] Processing ${queueItems.length} queued items...`);

            for (const item of queueItems) {
                try {
                    const success = await this.executeRequest(item);
                    if (success) {
                        await del(`${SYNC_QUEUE_KEY}_${item.id}`);
                        this.updateQueueLength();
                        console.log(`[SyncManager] Item ${item.id} synced successfully.`);
                    } else {
                        // Keep in queue, maybe increment retry count
                        console.warn(`[SyncManager] Item ${item.id} failed to sync.`);
                    }
                } catch (err) {
                    console.error(`[SyncManager] Error syncing item ${item.id}:`, err);
                }
            }
        } catch (error) {
            console.error('[SyncManager] Error processing queue:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Execute a single sync request
     */
    private async executeRequest(item: SyncRequest): Promise<boolean> {
        // Implementation depends on payload structure
        // This maps the queue item back to a Supabase call

        if (!item.table) return false;

        const { table, action, payload } = item;

        try {
            // Special handling for SMS queue
            if (table === 'sms_queue' && action === 'INSERT') {
                console.log('[SyncManager] Sending queued SMS:', payload);
                const { sendDirectMessage } = await import('./sms');
                await sendDirectMessage(
                    payload.phone,
                    payload.message,
                    payload.channels || ['sms'],
                    payload.storeId
                );
                return true;
            }

            let result;
            if (action === 'INSERT') {
                result = await supabase.from(table).insert(payload);
            } else if (action === 'UPDATE') {
                if (!payload.id) throw new Error('Update requires ID');
                const { id, ...data } = payload;
                result = await supabase.from(table).update(data).eq('id', id);
            } else if (action === 'DELETE') {
                if (!payload.id) throw new Error('Delete requires ID');
                result = await supabase.from(table).delete().eq('id', payload.id);
            } else if (action === 'RPC') {
                // handle stored procedures if needed
            } else if (action === 'SALE_TRANSACTION') {
                // Complex handling for offline sale
                return await this.syncOfflineSale(payload);
            }

            if (result && result.error) {
                console.error('[SyncManager] Supabase error:', result.error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('[SyncManager] Execution error:', e);
            return false;
        }
    }

    private async syncOfflineSale(payload: any): Promise<boolean> {
        // Reconstruct the logic from inventory-context processSale
        // Payload should contain: { activeStoreId, saleData, userId, timestamp }
        console.log('[SyncManager] Syncing offline sale:', payload);
        const { activeStoreId, saleData, userId } = payload;

        try {
            // 1. Handle Customer (if provided)
            let customerId = saleData.customerId || null;
            let pointsEarned = 0;
            let loyaltyConfig = null;

            if (saleData.customer && saleData.customer.phone && !customerId) {
                // Check if customer exists
                const { data: existing } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('store_id', activeStoreId)
                    .eq('phone', saleData.customer.phone)
                    .single();

                if (existing) {
                    customerId = existing.id;
                } else {
                    // Create new customer
                    const { data: newCustomer } = await supabase.from('customers').insert({
                        store_id: activeStoreId,
                        name: saleData.customer.name || 'Unknown',
                        phone: saleData.customer.phone,
                        total_spent: 0,
                        points: 0
                    }).select().single();
                    if (newCustomer) customerId = newCustomer.id;
                }
            }

            // Fetch Loyalty Config
            if (customerId) {
                const { data: config } = await supabase
                    .from('loyalty_programs')
                    .select('*')
                    .eq('store_id', activeStoreId)
                    .single();

                if (config && config.enabled) {
                    loyaltyConfig = config;
                    const rate = config.points_per_currency || 1;
                    pointsEarned = Math.floor(saleData.totalAmount * rate);
                }
            }

            // 2. Insert Sale with ALL fields
            const { data: sale, error: saleError } = await supabase.from('sales').insert({
                store_id: activeStoreId,
                total_amount: saleData.totalAmount,
                payment_method: saleData.paymentMethod,
                employee_id: userId,
                customer_id: customerId,
                status: 'completed',
                points_earned: pointsEarned,
                points_redeemed: saleData.pointsRedeemed || 0,
                loyalty_discount_amount: saleData.loyaltyDiscount || 0,
                tax_amount: saleData.taxAmount || 0,
                total_discount: saleData.totalDiscount || 0,
                created_at: new Date(payload.timestamp || Date.now()).toISOString() // Preserve offline time
            }).select().single();

            if (saleError || !sale) {
                console.error('[SyncManager] Sale insert error:', saleError);
                throw saleError;
            }

            // 3. Sale Items
            if (saleData.items && saleData.items.length > 0) {
                const saleItems = saleData.items.map((item: any) => ({
                    sale_id: sale.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_sale: item.price,
                    subtotal: item.quantity * item.price
                }));
                const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
                if (itemsError) {
                    console.error('[SyncManager] Sale items error:', itemsError);
                    throw itemsError;
                }

                // 4. Update Stock (Batch Update) with Conflict Detection
                const stockUpdates: { id: any; stock: number }[] = [];
                const conflictNotifications: any[] = [];

                // Fetch current stock for all items in one go
                const { data: serverProducts } = await supabase
                    .from('products')
                    .select('id, stock, name')
                    .in('id', saleData.items.map((i: any) => i.id));

                if (serverProducts) {
                    saleData.items.forEach((item: any) => {
                        const product = serverProducts.find(p => p.id === item.id);
                        if (product) {
                            const currentServerStock = product.stock;
                            const requestedQuantity = item.quantity;
                            const newStock = currentServerStock - requestedQuantity;

                            // Detect stock conflict
                            if (currentServerStock < requestedQuantity) {
                                console.warn(`[SyncManager] ⚠️ STOCK CONFLICT: ${product.name}`);
                                conflictNotifications.push({
                                    store_id: activeStoreId,
                                    title: '⚠️ Stock Conflict Detected',
                                    message: `Offline sale synced for "${product.name}" but stock was insufficient. Server had ${currentServerStock}, sale was for ${requestedQuantity}. Stock adjusted to ${Math.max(0, newStock)}.`,
                                    type: 'warning',
                                    is_read: false
                                });
                            }

                            stockUpdates.push({ id: item.id, stock: Math.max(0, newStock) });
                        }
                    });

                    // Batch Update Stock
                    if (stockUpdates.length > 0) {
                        const { error: stockError } = await supabase
                            .from('products')
                            .upsert(stockUpdates, { onConflict: 'id' });
                        if (stockError) console.error('[SyncManager] Batch stock update error:', stockError);
                    }

                    // Batch Insert Conflict Notifications
                    if (conflictNotifications.length > 0) {
                        const { error: notifError } = await supabase
                            .from('notifications')
                            .insert(conflictNotifications);
                        if (notifError) console.error('[SyncManager] Batch notification error:', notifError);
                    }
                }
            }

            // 5. Record Payment
            if (saleData.totalAmount > 0) {
                await supabase.from('sale_payments').insert({
                    sale_id: sale.id,
                    amount: saleData.totalAmount,
                    payment_method: saleData.paymentMethod,
                    recorded_by: userId
                });
            }

            // 6. Update Customer Loyalty & Total Spent
            if (customerId) {
                const { data: currentCust } = await supabase
                    .from('customers')
                    .select('points, total_spent, total_visits')
                    .eq('id', customerId)
                    .single();

                if (currentCust) {
                    const redeemed = saleData.pointsRedeemed || 0;
                    const newPoints = Math.max(0, (currentCust.points || 0) + pointsEarned - redeemed);
                    const newTotalSpent = (currentCust.total_spent || 0) + saleData.totalAmount;
                    const newTotalVisits = (currentCust.total_visits || 0) + 1;

                    await supabase.from('customers').update({
                        points: newPoints,
                        total_spent: newTotalSpent,
                        total_visits: newTotalVisits,
                        last_visit: new Date().toISOString()
                    }).eq('id', customerId);

                    // Log Loyalty Earned
                    if (pointsEarned > 0) {
                        await supabase.from('loyalty_logs').insert({
                            store_id: activeStoreId,
                            customer_id: customerId,
                            points: pointsEarned,
                            type: 'earned',
                            description: `Earned from Offline Sale #${sale.id.slice(0, 8)}`
                        });
                    }

                    // Log Loyalty Redeemed
                    if (redeemed > 0) {
                        await supabase.from('loyalty_logs').insert({
                            store_id: activeStoreId,
                            customer_id: customerId,
                            points: redeemed,
                            type: 'redeemed',
                            description: `Redeemed on Offline Sale #${sale.id.slice(0, 8)}`
                        });
                    }
                }
            }

            console.log('[SyncManager] Offline sale synced successfully:', sale.id);
            return true;
        } catch (err) {
            console.error('[SyncManager] Failed to sync offline sale', err);
            return false;
        }
    }
}

export const syncManager = new SyncManager();
