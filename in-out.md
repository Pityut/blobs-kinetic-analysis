# Individual Blob Kinetics — Input / Output & Pipeline Logic

## Input

**Path:** `inputs/individual_blob_kinetics/`

**Format:** One `.xlsx` file per field-of-view.

**Naming convention:** `{genotype} replicate {N} field {M}.xlsx`
- Genotype: `WT` or `KO`
- 3 replicates × 3 fields = 18 files total

**Required columns (single sheet):**

| Column              | Type    | Description                          |
|---------------------|---------|--------------------------------------|
| `frame_index_kept`  | int     | Frame number (sequential index)      |
| `x`                 | float   | Blob center X coordinate (px)        |
| `y`                 | float   | Blob center Y coordinate (px)        |
| `radius`            | float   | Blob radius (px)                     |
| `mean_r`            | float   | Mean red-channel intensity of blob   |

Each row = one detected blob in one frame. Multiple blobs per frame, multiple frames per file.

**Timing:** frames are acquired every 30 minutes (`frame_interval_min = 30`).

---

## Pipeline Logic

The notebook processes each input file independently through these stages:

### 1. Isolation Filtering

For each blob in each frame, compute:
- **nn_distance** — Euclidean distance to the nearest neighboring blob center
- **is_overlapping** — whether center distance < `overlap_factor × (r_i + r_j) + margin`

A blob is marked **isolated** when `nn_distance >= 15.0 px` (configurable via `min_nn_distance`).

### 2. Blob Tracking (Cross-Frame Linking)

For each consecutive frame pair (t → t+1):
- Match isolated blobs using **greedy nearest-neighbor** with `max_link_distance = 10.0 px`
- Each blob matches at most one blob in the next frame
- Assign `track_id` — propagated across linked pairs

### 3. Continuous Track Selection

From all tracks, keep only those that:
- Have **≥ 2 consecutive frames** (no gaps)
- Are strictly consecutive: frames [2,3,4] ✓, frames [2,4] ✗

### 4. Kinetics Computation

#### Point-level (one row per blob per timepoint)
- `time_min = frame_index_kept × 30`
- `time_hr = time_min / 60`

#### Interval-level (one row per consecutive pair within a track)
- `dI/dt = (I_{t+1} - I_t) / (time_{t+1} - time_t)` in units of **intensity / hour**
- `phase_class`: `brightening` if dI/dt > 0, `dimming` if < 0, `stable` if ≈ 0

#### Summaries
- **Track-level summary** — one row per track: length, start/end intensity, mean/min/max dI/dt, brightening/dimming/stable counts
- **Timepoint summary** — mean ± SD of intensity and dI/dt across all tracks at each time
- **Direction summary** — fraction of intervals that are brightening/dimming/stable at each midpoint time

### 5. QC Table

Tracks attrition: raw → isolated → tracked → selected → kinetics.

---

## Output

**Path:** `outputs/individual_blob_kinetics/{genotype} replicate {N}/`

### Per field (one input → two xlsx + plots)

**1. `{name}_individual_blob_kinetics.xlsx`** — 10 sheets:

| Sheet                    | Content                                        |
|--------------------------|------------------------------------------------|
| `all_blobs_raw`          | Raw input data (unchanged)                     |
| `isolation_metrics`      | All blobs with nn_distance, is_isolated flags  |
| `tracked_blobs`          | All blobs with track_id, selection flags        |
| `selected_blob_points`   | Selected blobs: track_id, time, mean_r         |
| `selected_blob_intervals`| Consecutive-pair dI/dt, phase_class             |
| `track_level_summary`    | One row per track: length, intensity stats      |
| `point_summary`          | Field-level mean_r ± SD per timepoint           |
| `interval_summary`       | Field-level dI/dt ± SD per midpoint time        |
| `direction_summary`      | Fraction brightening/dimming/stable per time    |
| `selection_qc`           | Attrition counts at each pipeline step          |

**2. `{name}_individual_blob_kinetics_with_track_layout.xlsx`** — same as above plus:
- `track_manual_plot_layout` sheet with embedded dI/dt bar charts per track
- `track_plots/` subfolder with individual PNG bar charts

**3. PNG plots** (if `save_plots = True`):

| File                                         | Content                                    |
|----------------------------------------------|--------------------------------------------|
| `*_individual_mean_r.png`                    | Individual track intensity trajectories    |
| `*_field_mean_r.png`                         | Field mean intensity ± SD                  |
| `*_gradient_software_style.png`              | Individual dI/dt per track                 |
| `*_individual_dIdt.png`                      | Same as above, alternate style             |
| `*_field_dIdt.png`                           | Field mean dI/dt ± SD                      |
| `*_blob_kinetics_4panel.png`                 | A/B/C/D composite summary figure           |
| `*_track_plots/track_{id}_dIdt_bar.png`      | Per-track dI/dt bar chart                  |

---

## Config (key parameters)

| Parameter               | Default | Meaning                                   |
|-------------------------|---------|-------------------------------------------|
| `frame_interval_min`    | 30      | Minutes between consecutive frames         |
| `min_consecutive_frames`| 2       | Minimum track length to keep               |
| `min_nn_distance`       | 15.0    | Isolation: min nearest-neighbor distance   |
| `max_link_distance`     | 10.0    | Tracking: max distance to link across frames|
| `intensity_col`         | `mean_r`| Red-channel intensity column               |
