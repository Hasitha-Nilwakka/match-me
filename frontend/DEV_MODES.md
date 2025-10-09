# Development Modes Guide

## Available Dev Modes

### 1. Standard Development Mode
```bash
npm run dev
```

**Use when:**
- Desktop development
- Debugging issues
- Need full dev tooling

**Includes:**
- ✅ Hot Module Replacement (HMR)
- ✅ Build activity indicator (bottom-right)
- ✅ Error overlay (red screen)
- ✅ Turbopack compilation status
- ✅ All debugging features

---

### 2. Mobile/Clean Development Mode
```bash
npm run dev:mobile
# OR
npm run dev:clean
```

**Use when:**
- Testing on mobile devices (Android, iPad)
- Showing the app to others
- Need clean UI without dev overlays
- Recording demos/screenshots

**Includes:**
- ✅ Hot Module Replacement (HMR)
- ❌ Build activity indicator (hidden)
- ⚠️ Error overlay (still shows for critical errors)
- ✅ Full dev speed and features

**Note:** This mode still shows error overlays for critical errors. For a completely clean experience, use production mode.

---

### 3. Production Mode
```bash
npm run build
npm start
```

**Use when:**
- Final testing before deployment
- Performance testing
- Need exact production behavior
- Absolutely no dev indicators

**Includes:**
- ❌ No dev overlays
- ❌ No build indicators
- ❌ No HMR (need to rebuild for changes)
- ✅ Optimized bundle
- ✅ Production performance

---

## How It Works

The `dev:mobile` and `dev:clean` scripts set an environment variable:
```bash
NEXT_DEV_OVERLAY=false
```

Next.js config (`next.config.ts`) reads this and disables the build activity indicator:
```typescript
devIndicators: {
  buildActivity: process.env.NEXT_DEV_OVERLAY !== 'false',
}
```

---

## Quick Reference

| Feature | `dev` | `dev:mobile` | production |
|---------|-------|--------------|------------|
| HMR | ✅ | ✅ | ❌ |
| Build indicator | ✅ | ❌ | ❌ |
| Error overlay | ✅ | ⚠️ Critical only | ❌ |
| Speed | Fast | Fast | Fastest |
| Bundle size | Large | Large | Optimized |
| Use case | Development | Mobile testing | Deployment |

---

## Mobile Testing Workflow

### On Android Phone/iPad:

1. **Start clean dev server:**
   ```bash
   npm run dev:mobile
   ```

2. **Connect to server:**
   - Find your IP: `http://192.168.x.x:3000`
   - Open in mobile browser

3. **Test features:**
   - No build indicator in corner
   - Clean UI for testing
   - Hot reload still works!

4. **If you see an error:**
   - Error overlay may still appear (critical errors only)
   - Switch to desktop and run `npm run dev` to debug
   - Fix the error, then back to `dev:mobile`

---

## Troubleshooting

**Q: I still see the build indicator**
- Make sure you started with `npm run dev:mobile`, not `npm run dev`
- Restart the dev server after changing modes

**Q: I want to hide ALL overlays (including errors)**
- Use production mode: `npm run build && npm start`
- Note: No hot reload, slower iteration

**Q: Error overlay is blocking my mobile view**
- Fix the error! The overlay is helpful
- Or temporarily use production build for demo

**Q: Which mode should I use daily?**
- Desktop dev: `npm run dev` (full tooling)
- Mobile testing: `npm run dev:mobile` (clean UI)
- Pre-deployment: `npm run build && npm start` (production)

---

## Tips

- **Keep `npm run dev` as default** for development
- **Use `dev:mobile` only when testing on real devices** or showing to others
- **The build indicator is actually useful** during development - shows when code is compiling
- **Error overlays help you catch bugs early** - don't hide them permanently

---

## Future Improvements

If you want to hide the error overlay too in mobile mode, you'd need to:
1. Use a custom Next.js webpack plugin
2. Or always use production builds for mobile testing

For now, the build indicator removal is the best balance between clean UI and useful debugging.

