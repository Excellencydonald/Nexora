# NEXORA Development Log

**Current Version:** V5.1  
**Date:** 2026-11-11  
**Budget:** $0 / ₦0 maintained  

---

## V5.1 — Security questions & password recovery

### New
- Registration requires a **security question + answer** (saved with account)
- Login screen: **Forgot password?**
- Recovery flow: username → security question → answer → new password

### Notes
- Local only (no email reset yet)
- Answers stored lowercased for matching
- Existing accounts created before V5.1 have no security question until they re-register
