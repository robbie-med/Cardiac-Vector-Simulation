# About the EKG Simulation Physics

The core of this project is a **Dipole Summation Model** used to generate synthetic 12-lead EKG waveforms based on myocardial activation patterns.

## 🧬 How it Works

### 1. Myocardial Segmentation
The heart is modeled as a collection of 34 distinct myocardial segments (based on standard anatomical models). Each segment is assigned a 3D position vector relative to the center of the heart.

### 2. Activation Sequence (Durrer 1970)
Each segment has a specific "activation time" ($t_{act}$), representing when the depolarization wave reaches it. These timings are derived from classical electrophysiological studies (Durrer et al., 1970).

### 3. The Dipole Model
When a segment depolarizes, it creates a local electrical dipole $\vec{D}$. The total cardiac vector $\vec{V}_{total}$ at any time $t$ is the vector sum of all active segment dipoles:

$$\vec{V}_{total}(t) = \sum_{i=1}^{34} \vec{D}_i(t)$$

### 4. Lead Projection
To find the voltage in a specific EKG lead (e.g., Lead II or V1), the total cardiac vector is projected onto the 3D unit vector $\vec{L}$ representing that specific lead's orientation in the body:

$$Voltage_{lead} = \vec{V}_{total} \cdot \vec{L}$$

## 📈 Components Simulated
- **P-wave**: Atrial depolarization.
- **QRS Complex**: Ventricular depolarization (the "heartbeat" spike).
- **T-wave**: Ventricular repolarization.
- **PR and ST segments**: Isoelectric periods representing conduction delays.

## 📚 References
- Durrer D, van Dam RT, Freud GE, Janse MJ, Meijler FL, Arzbaecher RC. *Total excitation of the isolated human heart.* Circulation. 1970;41(6):899-912.
