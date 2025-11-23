# HTML Games Collection

A collection of browser-based games built with HTML5, CSS, and JavaScript. This project serves as a playground for experimenting with game development using standard web technologies.

## Games Included

### 1. Flappy Bird
A clone of the popular tapping game. Navigate the bird through the pipes by clicking or tapping the screen.
- **Controls**: Click / Tap to fly.

### 2. Sky Ace (Sonic Wings Clone)
A vertical scrolling shooter inspired by classic arcade games like Sonic Wings / Aero Fighters.
- **Controls**:
    - **Arrow Keys**: Move the ship horizontally.
    - **Space**: Shoot.
- **Objective**: Survive as long as possible while destroying enemy ships and accumulating score.
- **Scoring**: Earn points for each enemy destroyed; higher‑level enemies give more points.
- **Power‑ups**:
    - **EMP Bomb** (available after destroying certain enemies): Press the EMP button to clear all enemies on screen.
    - **Weapon Upgrades**: Collect upgrade drops to increase firepower.
    - **Health Packs**: Restore ship integrity.

### 3. Dice Master
A prediction game where you compete against a Markov Chain AI.
- **Controls**: Select a number (1-6) and roll the dice.
- **Features**:
    - **Markov Chain AI**: Predicts your next roll based on historical patterns.
    - **3D Dice Animation**: CSS-based 3D rolling effect.
    - **Statistics**: Real-time frequency chart and accuracy comparison.

## How to Play

1. Clone the repository or download the files.
2. Open `index.html` in any modern web browser.
3. Select a game from the main menu to start playing.

## Deployment

You can deploy these games for free using **Surge.sh**, a simple CLI for static web publishing.

### Prerequisites
- Node.js and npm installed.

### Steps
1. Open your terminal in the project directory.
2. Run the following command:
   ```bash
   npx surge
   ```
3. Follow the prompts:
   - **Email/Password**: Create an account or log in.
   - **Project Path**: Press Enter to accept the current directory.
   - **Domain**: Press Enter to accept the random domain or type your own.
4. Your game will be live at the displayed URL!

## Technology Stack

- **HTML5 Canvas**: For high-performance 2D rendering.
- **Vanilla JavaScript**: Core game logic without external framework dependencies.
- **Bootstrap 5**: For the main menu and responsive UI layout.

## Credits

These games were created using **Gemini 3 Pro** in the **AntiGravity IDE**.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
