import { useState, useEffect } from 'react';
import { syncManager } from './sync-manager';

export function useSyncStatus() {
    const [status, setStatus] = useState(syncManager.getQueueStatus());

    useEffect(() => {
        const unsubscribe = syncManager.subscribe(() => {
            setStatus(syncManager.getQueueStatus());
        });
        return unsubscribe;
    }, []);

    return status;
}
