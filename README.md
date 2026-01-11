# UNO Game

A complete, production-ready web-based UNO game built with React, TypeScript, and Tailwind CSS.

## Features

- **Complete UNO Gameplay**: All standard UNO rules including number cards, action cards (Skip, Reverse, Draw Two), and Wild cards (Wild, Wild Draw Four)
- **Smart AI Opponents**: 1-3 AI players with strategic gameplay
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Smooth Animations**: Framer Motion powered card dealing, playing, and transitions
- **Accessibility**: Keyboard support, ARIA labels, color-blind friendly design with shape indicators
- **Settings**: Customizable game rules, animation intensity, and opponent count
- **Error-Free**: Comprehensive error handling and defensive programming

## Game Rules

- **Standard UNO Rules**: Match color, number, or action type
- **Action Cards**: 
  - Skip: Skip next player
  - Reverse: Change direction (acts as Skip in 2-player games)
  - Draw Two: Next player draws 2 cards
- **Wild Cards**:
  - Wild: Change color
  - Wild Draw Four: Change color and next player draws 4 cards
- **UNO Call**: Must call UNO when down to 1 card (2-second window)
- **Win Condition**: First player to empty their hand wins

## Installation & Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Development

The project follows a clean architecture with:

- **Game Engine**: Pure TypeScript logic in `src/game/`
- **UI Components**: React components in `src/components/`
- **State Management**: Zustand store with defensive validation
- **Testing**: Comprehensive test suite with Vitest
- **Styling**: Tailwind CSS with custom animations

## Browser Support

- Modern browsers with ES2020 support
- Mobile Safari, Chrome, Firefox
- Respects user preferences for reduced motion
- High contrast mode support

## Performance

- Optimized animations with Framer Motion
- Efficient state updates with Zustand
- Minimal re-renders with proper memoization
- Smooth 60fps gameplay

## Accessibility

- Full keyboard navigation support
- ARIA labels for screen readers
- Color-blind support with shape indicators
- Respects `prefers-reduced-motion`
- High contrast mode compatibility

## License

MIT License - feel free to use this code for learning or personal projects.