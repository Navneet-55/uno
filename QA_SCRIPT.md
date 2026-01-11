# UNO Game - QA Testing Script

## Manual Testing Checklist

### 🎮 Basic Gameplay
- [ ] Game starts automatically with 4 players (1 human + 3 AI)
- [ ] Each player receives 7 cards
- [ ] First card in discard pile is not a Wild card
- [ ] Current player indicator shows correctly
- [ ] Direction arrow shows clockwise initially

### 🃏 Card Playing
- [ ] Click playable cards to play them
- [ ] Unplayable cards show shake animation when clicked
- [ ] Cards match by color, number, or action type
- [ ] Wild cards are always playable

### ⚡ Action Cards
- [ ] **Skip**: Next player is skipped
- [ ] **Reverse**: Direction changes (or acts as Skip in 2-player)
- [ ] **Draw Two**: Next player draws 2 cards and loses turn
- [ ] **Wild**: Color picker modal appears
- [ ] **Wild Draw Four**: Color picker modal appears, next player draws 4

### 🎯 Wild Card Color Selection
- [ ] Modal appears when Wild or Wild Draw Four is played
- [ ] Four color options are available (Red, Yellow, Green, Blue)
- [ ] Selected color becomes the current color
- [ ] Game continues after color selection

### 🚨 UNO Call System
- [ ] "UNO!" appears when player has 1 card
- [ ] UNO call button appears with countdown timer
- [ ] Clicking UNO button within time limit continues game
- [ ] Missing UNO call results in 2-card penalty
- [ ] AI players automatically call UNO

### 🏆 Win Conditions
- [ ] Game ends when a player empties their hand
- [ ] Winner is announced in game over screen
- [ ] "Play Again" button starts new game
- [ ] "Settings" button opens configuration

### 🤖 AI Behavior
- [ ] AI players make legal moves only
- [ ] AI players draw cards when no playable cards
- [ ] AI players choose Wild colors strategically
- [ ] AI players automatically call UNO
- [ ] No console errors from AI moves

### ⚙️ Settings & Configuration
- [ ] Settings button opens configuration drawer
- [ ] AI opponent count adjustable (1-3)
- [ ] Draw stacking toggle works
- [ ] Strict Wild Draw Four toggle works
- [ ] Animation intensity toggle works
- [ ] New Game button restarts with new settings

### 📱 Responsive Design
- [ ] Game works on desktop (1920x1080)
- [ ] Game works on tablet (768x1024)
- [ ] Game works on mobile (375x667)
- [ ] Cards are readable at all screen sizes
- [ ] Touch interactions work on mobile

### ♿ Accessibility
- [ ] Tab navigation works through all interactive elements
- [ ] Enter key plays selected cards
- [ ] 'D' key draws cards
- [ ] 'U' key calls UNO
- [ ] ESC key closes modals
- [ ] Screen reader announces card information
- [ ] Color-blind indicators visible on cards

### 🎨 Visual Polish
- [ ] Card dealing animation plays at game start
- [ ] Card play animations are smooth
- [ ] Turn transitions are clear
- [ ] Current player highlighting works
- [ ] Color indicators are accurate
- [ ] No visual glitches or overlaps

### 🔧 Error Handling
- [ ] No console errors during normal gameplay
- [ ] No crashes when clicking rapidly
- [ ] Graceful handling of edge cases
- [ ] Game state remains consistent
- [ ] Deck reshuffles when empty

### 🚀 Performance
- [ ] Game loads quickly (< 3 seconds)
- [ ] Animations are smooth (60fps)
- [ ] No memory leaks during extended play
- [ ] Responsive to user input
- [ ] No lag during AI turns

## Test Scenarios

### Scenario 1: Complete Game
1. Start new game
2. Play through entire game to completion
3. Verify winner announcement
4. Start another game

### Scenario 2: UNO Call Testing
1. Play until you have 2 cards
2. Play a card to get to 1 card
3. Test both calling UNO and missing the call
4. Verify penalty system works

### Scenario 3: Wild Card Chain
1. Play Wild card and choose color
2. Next player plays Wild Draw Four
3. Verify color selection and draw penalty
4. Continue game normally

### Scenario 4: Settings Changes
1. Open settings
2. Change AI count to 1
3. Enable strict Wild Draw Four
4. Start new game
5. Verify changes took effect

### Scenario 5: Mobile Experience
1. Open game on mobile device
2. Test touch interactions
3. Verify responsive layout
4. Test settings drawer on mobile

## Expected Results

✅ **All tests should pass without errors**
✅ **Game should feel polished and professional**
✅ **No console errors or warnings**
✅ **Smooth 60fps performance**
✅ **Intuitive user experience**

## Bug Reporting

If any test fails, note:
- Browser and version
- Screen size
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)