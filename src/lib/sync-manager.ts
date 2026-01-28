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
        // Payload should contain: { activeStoreId, saleData, user }
        console.log('[SyncManager] Syncing offline sale:', payload);
        const { activeStoreId, saleData, userId } = payload;

        try {
            // 1. Insert Sale
            const { data: sale, error: saleError } = await supabase.from('sales').insert({
                store_id: activeStoreId,
                total_amount: saleData.totalAmount,
                payment_method: saleData.paymentMethod,
                employee_id: userId,
                customer_id: saleData.customerId, // processed before queueing or during
                status: 'completed',
                created_at: new Date(payload.timestamp || Date.now()).toISOString() // Preserve offline time
            }).select().single();

            if (saleError || !sale) throw saleError;

            // 2. Sale Items
            if (saleData.items && saleData.items.length > 0) {
                const saleItems = saleData.items.map((item: any) => ({
                    sale_id: sale.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_sale: item.price,
                    subtotal: item.quantity * item.price
                }));
                const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
                if (itemsError) throw itemsError;

                // 3. Update Stock (One by one to be safe)
                for (const item of saleData.items) {
                    const { error: stockError } = await supabase.rpc('decrement_stock', {
                        p_id: item.id,
                        quantity: item.quantity
                    });
                    // Fallback to update if RPC missing, but RPC is safer. 
                    // Assuming direct update for now to match current logic if no RPC
                    if (stockError) {
                        // Try direct update
                        await supabase.from('products').update({
                            stock: item.currentStock - item.quantity // Might be inaccurate if stock changed on server. 
                            // Better to use rpc 'decrement' but sticking to context logic for now
                        }).eq('id', item.id);
                    }
                }
            }

            // 4. Payments
            if (saleData.totalAmount > 0) {
                await supabase.from('sale_payments').insert({
                    sale_id: sale.id,
                    amount: saleData.totalAmount,
                    payment_method: saleData.paymentMethod,
                    recorded_by: userId
                });
            }

            return true;
        } catch (err) {
            console.error('[SyncManager] Failed to sync offline sale', err);
            return false;
        }
    }
}

export const syncManager = new SyncManager();
