# Client-Side vs Centralized Scanning

## Current Architecture: **Centralized** (Supabase Edge Functions)

### How it works now:
- Scan runs on **Supabase's servers** (Edge Functions)
- User clicks "Scan Now" → Frontend calls Edge Function → Function runs on Supabase → Results saved to database
- All users share the same server infrastructure

### Pros:
✅ **Security**: API keys stay on server (never exposed to users)  
✅ **Reliability**: Server always available, consistent performance  
✅ **No CORS issues**: Server can call any API  
✅ **User's device doesn't do work**: Better battery/performance for users  
✅ **Centralized rate limits**: Easier to manage and optimize  

### Cons:
❌ **Server costs**: You pay for Edge Function execution time  
❌ **Shared rate limits**: All users share same IP/rate limits  
❌ **Scalability**: More users = more server load  
❌ **Privacy**: Reddit sees requests from Supabase's IP, not user's IP  

---

## Alternative: **Client-Side** (Browser-based)

### How it would work:
- Scan runs in **user's browser** (JavaScript)
- User clicks "Scan Now" → Browser fetches Reddit directly → Matches saved via API call
- Each user's device does the scanning work

### Pros:
✅ **Privacy**: Reddit sees user's IP, not yours  
✅ **No server costs**: Users' devices do the work  
✅ **Individual rate limits**: Each user has their own rate limit  
✅ **Scales infinitely**: More users = no extra server cost  

### Cons:
❌ **Security risk**: API keys would be exposed in frontend code (anyone can steal them)  
❌ **CORS issues**: Reddit/Twitter APIs might block browser requests  
❌ **User's device does work**: Uses battery, CPU, bandwidth  
❌ **Less reliable**: Depends on user's device/network  
❌ **Harder to debug**: Errors happen on user's device  

---

## Recommendation: **Hybrid Approach** (Best of Both)

### Option 1: Keep Centralized (Current) ✅ **RECOMMENDED**
- Keep Edge Functions for security
- Add caching layer to reduce API calls
- Use RSS feeds (no rate limits)
- Works well for MVP

### Option 2: Client-Side Proxy
- User's browser makes requests
- But goes through YOUR proxy server (Edge Function)
- Proxy adds API keys server-side
- User's IP visible to Reddit, but keys stay secure

### Option 3: Full Client-Side (Not Recommended)
- Only works if Reddit/Twitter allow CORS
- Requires exposing API keys (security risk)
- Only viable if using public RSS feeds (no keys needed)

---

## Current Status: **Centralized is Better**

For your use case, **centralized is the right choice** because:
1. **Security**: Twitter API requires Bearer Token (can't expose in frontend)
2. **RSS feeds work great**: No API keys needed, no rate limits
3. **Better UX**: Users don't wait for their device to process
4. **Easier to scale**: Add caching/queuing as you grow

---

## Increasing Volume (What We Just Did)

Instead of moving to client-side, we increased volume by:
1. ✅ Increased limits: 25 → 100 items per request
2. ✅ Multiple pages: Regex keywords now fetch 3 pages (new/hot/top)
3. ✅ Better coverage: More posts/comments scanned per keyword

This gives you **3-4x more volume** without changing architecture!




