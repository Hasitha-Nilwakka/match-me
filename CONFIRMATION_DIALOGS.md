# Confirmation Dialog Standards

This document outlines the standardized format for all confirmation dialogs in the Match-Me application.

## Dialog Format (Benchmark)

All confirmation dialogs follow this consistent pattern:

```tsx
<ConfirmDialog
  open={condition}
  title="[Action] [Object]"
  message="Are you sure you want to [action] this [object]?"
  confirmText="[Action]"
  cancelText="Cancel"
  onCancel={() => setConfirmState(null)}
  onConfirm={handleConfirm}
/>
```

## Current Confirmation Dialogs

### 1. Remove Connection
**Location**: `/app/connectionlist/page.tsx`

```tsx
<ConfirmDialog
  open={confirmRemoveId !== null}
  title="Remove Connection"
  message="Are you sure you want to remove this connection?"
  confirmText="Remove"
  cancelText="Cancel"
  onCancel={() => setConfirmRemoveId(null)}
  onConfirm={async () => {
    if (confirmRemoveId !== null) {
      const id = confirmRemoveId;
      setConfirmRemoveId(null);
      await handleRemoveConnection(id);
    }
  }}
/>
```

### 2. Dismiss Connection Request
**Location**: `/app/connectionrequests/page.tsx`

```tsx
<ConfirmDialog
  open={confirmRejectId !== null}
  title="Dismiss Request"
  message="Are you sure you want to dismiss this connection request?"
  confirmText="Dismiss"
  cancelText="Cancel"
  onCancel={() => setConfirmRejectId(null)}
  onConfirm={async () => {
    if (confirmRejectId !== null) {
      const id = confirmRejectId;
      setConfirmRejectId(null);
      await handleReject(id);
    }
  }}
/>
```

### 3. Delete Conversation (Chat)
**Location**: `/components/ChatPopup.tsx`

```tsx
<ConfirmDialog
  open={confirmDeleteChatId !== null}
  title="Delete Conversation"
  message="Are you sure you want to delete this conversation?"
  confirmText="Delete"
  cancelText="Cancel"
  onCancel={() => setConfirmDeleteChatId(null)}
  onConfirm={confirmDeleteChat}
/>
```

## Dialog Guidelines

### Title Format
- Use `[Action] [Object]` format (e.g., "Remove Connection", "Delete Conversation")
- Keep it short and clear
- Use title case

### Message Format
- Always start with "Are you sure you want to..."
- Describe the action in simple terms
- Keep it concise (one sentence)
- No exclamation marks
- Optional: Add consequence information if action is irreversible

### Button Text
- **Confirm Button**: Use the action verb (e.g., "Remove", "Delete", "Dismiss")
- **Cancel Button**: Always use "Cancel"
- Use title case for both buttons

### Visual Consistency
- All confirm buttons use red background (`bg-red-600`)
- All cancel buttons use gray/white background with border
- Dialog appears centered on screen
- Uses consistent padding and spacing

## Component Reference

The `ConfirmDialog` component is located at `/components/ConfirmDialog.tsx` and supports:
- `open`: boolean - Controls visibility
- `title`: string - Dialog title (optional, defaults to "Confirm")
- `message`: string - Main message text
- `confirmText`: string - Confirm button text (optional, defaults to "Confirm")
- `cancelText`: string - Cancel button text (optional, defaults to "Cancel")
- `onConfirm`: function - Callback when confirmed
- `onCancel`: function - Callback when cancelled

## Best Practices

1. **State Management**: Use a dedicated state variable (e.g., `confirmDeleteChatId`) to track which item to confirm
2. **Prevent Propagation**: When triggering from buttons within clickable areas, use `e.stopPropagation()`
3. **Null Safety**: Always check if the confirm state is not null before performing the action
4. **Reset State**: Always reset the confirm state after the action completes (success or failure)
5. **Async Handling**: Use async/await for API calls within the confirm handler
6. **User Feedback**: Consider showing a toast notification after successful actions

## Migration Checklist

When adding a new confirmation dialog:

- [ ] Create state variable for tracking confirmation (e.g., `confirmDeleteId`)
- [ ] Update the trigger function to set the state instead of using native `confirm()`
- [ ] Create a confirm handler function
- [ ] Add `ConfirmDialog` component to JSX
- [ ] Use consistent title and message format
- [ ] Test the dialog on both desktop and mobile
- [ ] Ensure proper state cleanup

## Replaced Native Dialogs

The following native browser dialogs have been replaced with `ConfirmDialog`:

1. ✅ Connection removal - replaced native `confirm()`
2. ✅ Connection request dismissal - replaced native `confirm()`
3. ✅ Chat deletion - replaced native `confirm()`

## Future Enhancements

Potential improvements to consider:

- Add danger level variants (low, medium, high) with different colors
- Support for custom icons in dialogs
- Add animation transitions
- Support for longer messages with scrolling
- Add keyboard shortcuts (Enter = confirm, Esc = cancel)

