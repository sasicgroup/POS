# 🔍 Inventory Missing Items - Audit Report

**Date:** 2026-02-17  
**Issue:** Items that were sold previously mysteriously can't be found again - missing from database

---

## 🚨 Root Cause Analysis

### 1. **Cache-Based Architecture Issues**

#### Current Implementation:
- **15-minute cache TTL** (`CACHE_TTL = 15 * 60 * 1000`)
- **Page-based caching** with IndexedDB persistence
- **Auto-preload disabled** (line 148: `if (false)`) - intentionally disabled for egress optimization
- **Lazy loading mode** - only fetches when searching (lines 360-368)

#### The Problem:
```typescript
// From inventory-context.tsx line 360-368
if (hasSearch) {
    fetchProducts(page, pageSize, searchQuery);
} else {
    setProducts([]);  // ❌ CLEARS ALL PRODUCTS WHEN NO SEARCH
    setIsLoading(false);
}
```

**What's happening:**
1. When you first load the inventory/POS page, `products = []` (empty)
2. Only when you search or scan, items are fetched from the database
3. If the cache expires (15 minutes) and you haven't searched, items disappear
4. Multiple devices don't share cache - each device has its own local cache
5. Items sold on Device A won't appear on Device B unless explicitly searched

### 2. **Multi-Device Synchronization Gap**

#### Current State:
- Each device maintains its own **local IndexedDB cache**
- Cache key: `sms_inventory_cache_${activeStore.id}`
- No real-time synchronization between devices
- Cache refresh only happens on:
  - Manual search/scan
  - Background refresh after inventory changes (only on the device that made the change)

#### The Problem:
```
Device A: Sells "XBZ 36W BULB" → Updates local cache
Device B: Still has old cache (or no cache) → Item not visible unless searched
Device C: New device → Empty cache → Must search to see anything
```

### 3. **Database Query Limitations**

#### Current Query Pattern:
```typescript
// From sales/page.tsx line 391-396
const { data } = await supabase.from('products')
    .select('id, name, category, price, stock, sku, barcode, image, cost_price, status, video, store_id')
    .or(`sku.eq.${query},barcode.eq.${query},name.ilike.%${query}%`)
    .eq('store_id', activeStore.id)
    .limit(1)
    .single();
```

**Issues:**
- Only fetches **1 item** per search
- No batch loading
- No predictive caching
- Relies on exact match or partial name match

---

## 📊 Impact Assessment

### Egress Costs (Current State):
- ✅ **Reduced:** No auto-loading of all products
- ✅ **Optimized:** Only fetch on search/scan
- ❌ **Problem:** Multiple searches for same items across devices = redundant queries

### User Experience:
- ❌ **Confusing:** Items "disappear" when not searched
- ❌ **Slow:** Must search/scan every item individually
- ❌ **Frustrating:** Multi-device workflow broken
- ❌ **Error-prone:** Easy to think items are out of stock when they're just not loaded

### Data Integrity:
- ✅ **Database is fine:** Items are NOT actually missing from the database
- ❌ **Cache inconsistency:** Different devices show different inventory states
- ❌ **Stale data risk:** 15-minute cache can show outdated stock levels

---

## 🎯 Recommended Solutions

### Option 1: **Real-Time Search-Only Mode** (Your Request)
**Pros:**
- ✅ Minimal egress usage
- ✅ Always shows fresh data
- ✅ No cache management complexity

**Cons:**
- ❌ Slower UX (network request per search)
- ❌ Doesn't work offline
- ❌ More database load

**Implementation:**
1. Remove all caching logic
2. Fetch from database on every search/scan
3. Show items only when explicitly searched
4. Add loading indicators for each search

---

### Option 2: **Smart Hybrid Caching** (Recommended)
**Pros:**
- ✅ Balanced egress usage
- ✅ Fast UX with cached items
- ✅ Works offline
- ✅ Real-time updates for critical changes

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Requires Supabase Realtime subscriptions

**Implementation:**
1. Keep short cache (5 minutes instead of 15)
2. Subscribe to product changes via Supabase Realtime
3. Auto-invalidate cache on stock changes
4. Preload top 50 most-sold items on login
5. Search fetches from server if not in cache

---

### Option 3: **Session-Based Preload** (Middle Ground)
**Pros:**
- ✅ Moderate egress usage
- ✅ Good UX for active sessions
- ✅ Simpler than Option 2

**Cons:**
- ⚠️ Initial load time
- ⚠️ Doesn't work offline after cache expires

**Implementation:**
1. On login: Fetch top 100 products (most sold, low stock, or recent)
2. Cache for session duration (until logout or 1 hour)
3. Search extends cache with new items
4. Manual "Refresh Inventory" button to reload

---

## 🔧 Immediate Fix (Quick Win)

### Problem: Items show up only when searched
### Solution: Show recently accessed items + search results

```typescript
// Modify inventory-context.tsx
const [recentlyAccessedProducts, setRecentlyAccessedProducts] = useState<Product[]>([]);

// When a product is scanned/searched, add to recent list
const addToRecentlyAccessed = (product: Product) => {
    setRecentlyAccessedProducts(prev => {
        const filtered = prev.filter(p => p.id !== product.id);
        return [product, ...filtered].slice(0, 20); // Keep last 20
    });
};

// Display logic
const displayProducts = searchQuery 
    ? products // Search results
    : recentlyAccessedProducts; // Show recent when not searching
```

---

## 📋 Action Items

### Immediate (Today):
1. ✅ Document the issue (this report)
2. ⚠️ Decide on solution approach (Option 1, 2, or 3)
3. ⚠️ Implement chosen solution
4. ⚠️ Test across multiple devices

### Short-term (This Week):
1. Add "Refresh Inventory" button in settings
2. Show cache status indicator (age, item count)
3. Add "Recently Scanned" section in POS
4. Improve search to show "Did you mean?" suggestions

### Long-term (Next Sprint):
1. Implement Supabase Realtime for stock updates
2. Add predictive caching based on sales patterns
3. Optimize database queries with proper indexes
4. Add offline queue for sales when network is down

---

## 🧪 Testing Checklist

- [ ] Search for item on Device A → Should appear
- [ ] Sell item on Device A → Stock should update
- [ ] Search same item on Device B → Should show updated stock
- [ ] Wait 15+ minutes → Search again → Should still work
- [ ] Go offline → Search cached item → Should work
- [ ] Go offline → Search new item → Should show error
- [ ] Clear cache → Search → Should fetch from DB
- [ ] Scan barcode → Should add to cart immediately

---

## 💡 Key Insights

1. **Items are NOT missing from the database** - they're just not loaded in the UI
2. **Cache is per-device** - not shared across your multiple devices
3. **Current mode is "search-only"** - intentionally to save egress costs
4. **The 7-day cache you mentioned doesn't exist** - current TTL is 15 minutes
5. **Auto-preload is disabled** - line 148 has `if (false)` to prevent automatic loading

---

## 🎬 Next Steps

**Please confirm which solution you prefer:**
- **Option 1:** Pure real-time (no cache, always fetch from DB)
- **Option 2:** Smart hybrid (cache + realtime updates)
- **Option 3:** Session-based (preload on login, cache for session)

I'll implement the chosen solution immediately.
