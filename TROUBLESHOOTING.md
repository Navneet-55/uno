# UNO Game Troubleshooting Guide

## Current Status
The UNO game has been built with React + TypeScript + Vite and should be running at http://localhost:5173

## If You See a Blank White Page

### Step 1: Check Browser Console
1. Open your browser and navigate to http://localhost:5173
2. Open Developer Tools (F12 or right-click → Inspect)
3. Go to the Console tab
4. Look for any JavaScript errors (they will be in red)

### Step 2: Check Network Tab
1. In Developer Tools, go to the Network tab
2. Refresh the page
3. Look for any failed requests (they will be in red)
4. Check if all CSS and JS files are loading properly

### Step 3: Common Issues and Solutions

#### Issue: "Cannot resolve module" errors
**Solution:** Run `npm install` to ensure all dependencies are installed

#### Issue: TypeScript compilation errors
**Solution:** The game should compile without errors. Check the terminal for any TypeScript errors.

#### Issue: CSS not loading
**Solution:** Ensure Tailwind CSS is properly configured and the build process includes CSS processing.

#### Issue: Zustand store errors
**Solution:** Check the browser console for any state management errors.

## Expected Behavior

When the game loads correctly, you should see:

1. **Initial Loading Screen**: A green gradient background with "Setting up your game..." message
2. **Game Interface**: 
   - Game table with draw pile and discard pile in the center
   - Your hand of cards at the bottom
   - AI opponents' card backs on the sides/top
   - HUD panel on the right with game information
   - Settings button in the top right

## Manual Testing Steps

1. **Game Initialization**:
   - Page should load without errors
   - Game should automatically start with you and 3 AI opponents
   - You should see 7 cards in your hand
   - There should be a starting card in the discard pile

2. **Card Playing**:
   - Click on a playable card (highlighted/glowing) in your hand
   - Card should move to the discard pile
   - Turn should pass to the next player

3. **Drawing Cards**:
   - If you have no playable cards, click the draw pile
   - You should draw a card and the turn should pass

4. **Wild Cards**:
   - Playing a wild card should open a color selection modal
   - Selecting a color should change the current color indicator

5. **UNO Call**:
   - When you have one card left, you should see a UNO button
   - Clicking it should prevent the penalty

## Debug Information

The game includes extensive logging. Check the browser console for:
- "GameTable component rendering..."
- "Game state: {phase, players, error}"
- "Starting game..."
- Various game state updates

## If Problems Persist

1. **Clear Browser Cache**: Hard refresh with Ctrl+F5 (or Cmd+Shift+R on Mac)
2. **Restart Dev Server**: Stop the server (Ctrl+C) and run `npm run dev` again
3. **Check Dependencies**: Run `npm install` to ensure all packages are installed
4. **Check Node Version**: Ensure you're using Node.js 16+ and npm 7+

## Contact Information

If you continue to experience issues, please provide:
1. Browser console errors (screenshots or copy-paste)
2. Network tab information
3. Your browser and version
4. Your operating system

The game has been thoroughly tested and should work in all modern browsers.