# Cardiac Vector Simulation

An interactive 12-lead EKG simulator powered by a dipole summation physics engine.

## 🚀 Live Demo
**[View the EKG Simulator](https://robbie-med.github.io/Cardiac-Vector-Simulation/preview/ekg-viz/EkgSystemViz)**

## ✨ Features
- **Real-time EKG Generation**: Simulates all 12 standard leads using a physical dipole model.
- **System Architecture Visualization**: Interactive diagram of the simulator's data flow and physics engine.
- **Physiological Accuracy**: Based on the Durrer (1970) myocardial activation data with 34 simulated segments.
- **Interactive Controls**: Toggle between system architecture and the high-fidelity 12-lead strip.

## 🛠 Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Monorepo**: pnpm workspaces
- **Deployment**: GitHub Actions + GitHub Pages

## 📂 Project Structure
- `artifacts/mockup-sandbox`: The main visualization application and component gallery.
- `artifacts/api-server`: Backend Express server for data persistence (not used in the static GH Pages demo).
- `lib/`: Shared logic for database, API specifications, and Zod validation.

## 📖 Learn More
See [ABOUT.md](./ABOUT.md) for a deep dive into the underlying EKG physics and dipole summation model.
