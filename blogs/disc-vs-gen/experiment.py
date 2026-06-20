# cool_generative_vs_discriminative_experiment.py

import os
import shutil
import numpy as np
import matplotlib.pyplot as plt

from matplotlib.patches import Ellipse, Patch
from matplotlib.lines import Line2D
from matplotlib.animation import FuncAnimation, FFMpegWriter

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from scipy.stats import multivariate_normal


# ============================================================
# Config
# ============================================================

np.random.seed(7)

OUTPUT_DIR = "experiment_outputs"
FIG_DIR = os.path.join(OUTPUT_DIR, "figures")
VIDEO_DIR = os.path.join(OUTPUT_DIR, "videos")

os.makedirs(FIG_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

if not shutil.which("ffmpeg"):
    raise RuntimeError(
        "ffmpeg is required for MP4 export. Install it first, then rerun."
    )


# ============================================================
# Visual style
# ============================================================

COLORS = {
    "bg": "#0f172a",
    "panel": "#111827",
    "grid": "#334155",
    "text": "#e5e7eb",
    "muted": "#94a3b8",

    "class0": "#38bdf8",
    "class1": "#fb7185",

    "gen0": "#22d3ee",
    "gen1": "#f472b6",
    "gen_boundary": "#a78bfa",

    "disc": "#facc15",

    "sample0": "#67e8f9",
    "sample1": "#f9a8d4",
}

plt.rcParams.update({
    "figure.facecolor": COLORS["bg"],
    "axes.facecolor": COLORS["panel"],
    "savefig.facecolor": COLORS["bg"],
    "axes.edgecolor": COLORS["grid"],
    "axes.labelcolor": COLORS["muted"],
    "xtick.color": COLORS["muted"],
    "ytick.color": COLORS["muted"],
    "text.color": COLORS["text"],
    "axes.titlecolor": COLORS["text"],
    "font.size": 11,
    "axes.titleweight": "bold",
    "axes.titlesize": 16,
    "axes.labelsize": 12,
    "legend.frameon": True,
    "legend.facecolor": "#020617",
    "legend.edgecolor": "#334155",
})


# ============================================================
# Synthetic data
# ============================================================

n_per_class = 260

true_mean_0 = np.array([-2.2, -0.2])
true_mean_1 = np.array([2.1, 0.9])

true_cov_0 = np.array([
    [1.25, 0.65],
    [0.65, 1.0]
])

true_cov_1 = np.array([
    [1.05, -0.45],
    [-0.45, 1.25]
])

X0 = np.random.multivariate_normal(true_mean_0, true_cov_0, n_per_class)
X1 = np.random.multivariate_normal(true_mean_1, true_cov_1, n_per_class)

X = np.vstack([X0, X1])
y = np.array([0] * n_per_class + [1] * n_per_class)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.3,
    random_state=42,
    stratify=y
)


# ============================================================
# Models
# ============================================================

disc_model = LogisticRegression()
disc_model.fit(X_train, y_train)
disc_acc = accuracy_score(y_test, disc_model.predict(X_test))

classes = np.unique(y_train)
means = {}
covs = {}
priors = {}

for c in classes:
    X_c = X_train[y_train == c]
    means[c] = X_c.mean(axis=0)
    covs[c] = np.cov(X_c.T)
    priors[c] = len(X_c) / len(X_train)


def generative_predict(X_input):
    scores = []

    for c in classes:
        log_likelihood = multivariate_normal.logpdf(
            X_input,
            mean=means[c],
            cov=covs[c]
        )
        scores.append(log_likelihood + np.log(priors[c]))

    scores = np.vstack(scores).T
    return classes[np.argmax(scores, axis=1)]


gen_acc = accuracy_score(y_test, generative_predict(X_test))


# ============================================================
# Helpers
# ============================================================

def make_grid(X_data, padding=2.0, resolution=500):
    x_min, x_max = X_data[:, 0].min() - padding, X_data[:, 0].max() + padding
    y_min, y_max = X_data[:, 1].min() - padding, X_data[:, 1].max() + padding

    xx, yy = np.meshgrid(
        np.linspace(x_min, x_max, resolution),
        np.linspace(y_min, y_max, resolution)
    )

    grid = np.c_[xx.ravel(), yy.ravel()]
    return xx, yy, grid


xx, yy, grid = make_grid(X)

disc_proba = disc_model.predict_proba(grid)[:, 1].reshape(xx.shape)
gen_pred_grid = generative_predict(grid).reshape(xx.shape)


def style_axis(ax):
    ax.grid(True, color=COLORS["grid"], alpha=0.28, linewidth=0.8)
    ax.set_xlabel("$x_1$")
    ax.set_ylabel("$x_2$")

    for spine in ax.spines.values():
        spine.set_color(COLORS["grid"])

    ax.set_xlim(xx.min(), xx.max())
    ax.set_ylim(yy.min(), yy.max())


def scatter_training_data(ax, alpha=0.62, size=34):
    ax.scatter(
        X_train[y_train == 0, 0],
        X_train[y_train == 0, 1],
        s=size,
        alpha=alpha,
        color=COLORS["class0"],
        edgecolors="white",
        linewidths=0.25,
        label="Class 0 data"
    )

    ax.scatter(
        X_train[y_train == 1, 0],
        X_train[y_train == 1, 1],
        s=size,
        alpha=alpha,
        color=COLORS["class1"],
        edgecolors="white",
        linewidths=0.25,
        label="Class 1 data"
    )


def draw_cov_ellipse(mean, cov, ax, n_std=2.0, color=None, label=None):
    color = color or COLORS["gen"]

    eigvals, eigvecs = np.linalg.eigh(cov)
    order = eigvals.argsort()[::-1]

    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]

    angle = np.degrees(
        np.arctan2(eigvecs[1, 0], eigvecs[0, 0])
    )

    width, height = 2 * n_std * np.sqrt(eigvals)

    ellipse = Ellipse(
        xy=mean,
        width=width,
        height=height,
        angle=angle,
        fill=False,
        linewidth=3,
        edgecolor=color,
        linestyle="-",
        alpha=0.95,
        label=label
    )

    ax.add_patch(ellipse)


def plot_generative_boundary(ax, boundary):
    ax.contour(
        xx,
        yy,
        boundary,
        levels=[0.5],
        colors=[COLORS["gen_boundary"]],
        linewidths=3,
        linestyles="--"
    )


def plot_discriminative_boundary(ax):
    ax.contour(
        xx,
        yy,
        disc_proba,
        levels=[0.5],
        colors=[COLORS["disc"]],
        linewidths=3,
        linestyles="-"
    )


def save_figure(fig, name):
    path = os.path.join(FIG_DIR, name)
    fig.savefig(path, dpi=240, bbox_inches="tight")
    print(f"Saved: {path}")

def model_legend(
    ax,
    include_gen=False,
    include_disc=False,
    include_samples=False,
    loc="lower right"
):
    handles = [
        Line2D(
            [0], [0],
            marker="o",
            color="none",
            markerfacecolor=COLORS["class0"],
            markeredgecolor="white",
            markeredgewidth=0.4,
            markersize=8,
            label="Class 0 data"
        ),
        Line2D(
            [0], [0],
            marker="o",
            color="none",
            markerfacecolor=COLORS["class1"],
            markeredgecolor="white",
            markeredgewidth=0.4,
            markersize=8,
            label="Class 1 data"
        )
    ]

    if include_gen:
        handles.extend([
            Line2D(
                [0], [0],
                color=COLORS["gen0"],
                linewidth=3,
                label="Class 0 Gaussian"
            ),
            Line2D(
                [0], [0],
                color=COLORS["gen1"],
                linewidth=3,
                label="Class 1 Gaussian"
            ),
            Line2D(
                [0], [0],
                color=COLORS["gen_boundary"],
                linewidth=3,
                linestyle="--",
                label="Generative boundary"
            )
        ])

    if include_disc:
        handles.append(
            Line2D(
                [0], [0],
                color=COLORS["disc"],
                linewidth=3,
                label="Discriminative boundary"
            )
        )

    if include_samples:
        handles.extend([
            Line2D(
                [0], [0],
                marker="x",
                color=COLORS["sample0"],
                linestyle="none",
                markersize=9,
                markeredgewidth=2,
                label="Generated class 0"
            ),
            Line2D(
                [0], [0],
                marker="x",
                color=COLORS["sample1"],
                linestyle="none",
                markersize=9,
                markeredgewidth=2,
                label="Generated class 1"
            )
        ])

    legend = ax.legend(
        handles=handles,
        loc=loc,
        fontsize=9,
        framealpha=0.92
    )

    for text in legend.get_texts():
        text.set_color(COLORS["text"])


# ============================================================
# Figure 1: Dataset
# ============================================================

fig, ax = plt.subplots(figsize=(8, 6.8))

scatter_training_data(ax)
style_axis(ax)

ax.set_title("The same dataset can support two different learning goals")
ax.text(
    0.02,
    0.97,
    "Two classes in a 2D feature space",
    transform=ax.transAxes,
    va="top",
    color=COLORS["muted"],
    fontsize=11
)

model_legend(ax)

save_figure(fig, "01-dataset.png")
plt.close(fig)


# ============================================================
# Figure 2: Generative model
# ============================================================

fig, ax = plt.subplots(figsize=(8, 6.8))

scatter_training_data(ax, alpha=0.48)

draw_cov_ellipse(means[0], covs[0], ax, color=COLORS["gen0"])
draw_cov_ellipse(means[1], covs[1], ax, color=COLORS["gen1"])
plot_generative_boundary(ax, gen_pred_grid)

style_axis(ax)

ax.set_title("Generative model: learn the class distributions")
ax.text(
    0.02,
    0.97,
    f"Classifier obtained from learned distributions · accuracy = {gen_acc:.3f}",
    transform=ax.transAxes,
    va="top",
    color=COLORS["muted"],
    fontsize=11
)

model_legend(ax, include_gen=True)

save_figure(fig, "02-generative-model.png")
plt.close(fig)


# ============================================================
# Figure 3: Discriminative model
# ============================================================

fig, ax = plt.subplots(figsize=(8, 6.8))

scatter_training_data(ax, alpha=0.48)
plot_discriminative_boundary(ax)

style_axis(ax)

ax.set_title("Discriminative model: learn the separating boundary")
ax.text(
    0.02,
    0.97,
    f"Direct classifier · accuracy = {disc_acc:.3f}",
    transform=ax.transAxes,
    va="top",
    color=COLORS["muted"],
    fontsize=11
)

model_legend(ax, include_disc=True)

save_figure(fig, "03-discriminative-model.png")
plt.close(fig)

def fit_generative_partial(X_partial, y_partial):
    partial_means = {}
    partial_covs = {}
    partial_priors = {}

    for c in classes:
        X_c = X_partial[y_partial == c]

        if len(X_c) < 8:
            return None

        partial_means[c] = X_c.mean(axis=0)
        partial_covs[c] = np.cov(X_c.T) + 1e-5 * np.eye(2)
        partial_priors[c] = len(X_c) / len(X_partial)

    return partial_means, partial_covs, partial_priors


def generative_predict_from_params(X_input, partial_means, partial_covs, partial_priors):
    scores = []

    for c in classes:
        log_likelihood = multivariate_normal.logpdf(
            X_input,
            mean=partial_means[c],
            cov=partial_covs[c],
            allow_singular=True
        )

        scores.append(log_likelihood + np.log(partial_priors[c]))

    scores = np.vstack(scores).T
    return classes[np.argmax(scores, axis=1)]

def save_generative_boundary_learning_video():
    n_frames = 100
    frame_counts = np.linspace(18, len(X_train), n_frames).astype(int)

    fig, ax = plt.subplots(figsize=(8, 6.8))

    def update(frame):
        ax.clear()

        n = frame_counts[frame]
        X_partial = X_train[:n]
        y_partial = y_train[:n]

        ax.scatter(
            X_partial[y_partial == 0, 0],
            X_partial[y_partial == 0, 1],
            s=34,
            alpha=0.62,
            color=COLORS["class0"],
            edgecolors="white",
            linewidths=0.25
        )

        ax.scatter(
            X_partial[y_partial == 1, 0],
            X_partial[y_partial == 1, 1],
            s=34,
            alpha=0.62,
            color=COLORS["class1"],
            edgecolors="white",
            linewidths=0.25
        )

        params = fit_generative_partial(X_partial, y_partial)

        if params is not None:
            partial_means, partial_covs, partial_priors = params

            draw_cov_ellipse(
                partial_means[0],
                partial_covs[0],
                ax,
                color=COLORS["gen0"]
            )

            draw_cov_ellipse(
                partial_means[1],
                partial_covs[1],
                ax,
                color=COLORS["gen1"]
            )

            partial_pred = generative_predict_from_params(
                grid,
                partial_means,
                partial_covs,
                partial_priors
            ).reshape(xx.shape)

            plot_generative_boundary(ax, partial_pred)

        style_axis(ax)

        ax.set_title("Generative learning: distributions first, boundary second")
        ax.text(
            0.02,
            0.97,
            f"Training samples observed: {n}",
            transform=ax.transAxes,
            va="top",
            color=COLORS["muted"],
            fontsize=11
        )

        model_legend(ax, include_gen=True, loc="lower right")

    animation = FuncAnimation(
        fig,
        update,
        frames=n_frames,
        interval=60,
        repeat=True
    )

    mp4_path = os.path.join(VIDEO_DIR, "01-generative-boundary-learning.mp4")

    animation.save(
        mp4_path,
        writer=FFMpegWriter(fps=24, bitrate=2600)
    )

    plt.close(fig)
    print(f"Saved: {mp4_path}")
    
def save_discriminative_boundary_learning_video():
    n_frames = 100
    frame_counts = np.linspace(18, len(X_train), n_frames).astype(int)

    fig, ax = plt.subplots(figsize=(8, 6.8))

    def update(frame):
        ax.clear()

        n = frame_counts[frame]
        X_partial = X_train[:n]
        y_partial = y_train[:n]

        ax.scatter(
            X_partial[y_partial == 0, 0],
            X_partial[y_partial == 0, 1],
            s=34,
            alpha=0.62,
            color=COLORS["class0"],
            edgecolors="white",
            linewidths=0.25
        )

        ax.scatter(
            X_partial[y_partial == 1, 0],
            X_partial[y_partial == 1, 1],
            s=34,
            alpha=0.62,
            color=COLORS["class1"],
            edgecolors="white",
            linewidths=0.25
        )

        if len(np.unique(y_partial)) == 2:
            partial_disc = LogisticRegression()
            partial_disc.fit(X_partial, y_partial)

            partial_proba = partial_disc.predict_proba(grid)[:, 1].reshape(xx.shape)

            ax.contour(
                xx,
                yy,
                partial_proba,
                levels=[0.5],
                colors=[COLORS["disc"]],
                linewidths=3
            )

        style_axis(ax)

        ax.set_title("Discriminative learning: directly moving the boundary")
        ax.text(
            0.02,
            0.97,
            f"Training samples observed: {n}",
            transform=ax.transAxes,
            va="top",
            color=COLORS["muted"],
            fontsize=11
        )

        model_legend(ax, include_disc=True, loc="lower right")

    animation = FuncAnimation(
        fig,
        update,
        frames=n_frames,
        interval=60,
        repeat=True
    )

    mp4_path = os.path.join(VIDEO_DIR, "02-discriminative-boundary-learning.mp4")

    animation.save(
        mp4_path,
        writer=FFMpegWriter(fps=24, bitrate=2600)
    )

    plt.close(fig)
    print(f"Saved: {mp4_path}")

# ============================================================
# Figure 4: Generated samples
# ============================================================

generated_0 = np.random.multivariate_normal(means[0], covs[0], 180)
generated_1 = np.random.multivariate_normal(means[1], covs[1], 180)

fig, ax = plt.subplots(figsize=(8, 6.8))

scatter_training_data(ax, alpha=0.15, size=28)

draw_cov_ellipse(means[0], covs[0], ax, color=COLORS["gen0"])
draw_cov_ellipse(means[1], covs[1], ax, color=COLORS["gen1"])
plot_generative_boundary(ax, gen_pred_grid)

ax.scatter(
    generated_0[:, 0],
    generated_0[:, 1],
    marker="x",
    s=60,
    linewidths=1.8,
    color=COLORS["sample0"],
    alpha=0.9
)

ax.scatter(
    generated_1[:, 0],
    generated_1[:, 1],
    marker="x",
    s=60,
    linewidths=1.8,
    color=COLORS["sample1"],
    alpha=0.9
)

style_axis(ax)

ax.set_title("Generation comes from sampling the learned distributions")
ax.text(
    0.02,
    0.97,
    "The discriminative classifier has no equivalent sampling mechanism",
    transform=ax.transAxes,
    va="top",
    color=COLORS["muted"],
    fontsize=11
)

model_legend(ax, include_gen=True, include_samples=True)

save_figure(fig, "04-generated-samples.png")
plt.close(fig)


# ============================================================
# Video: Generative sampling only
# ============================================================

def save_sampling_video():
    n_frames = 120

    samples0 = np.random.multivariate_normal(means[0], covs[0], n_frames)
    samples1 = np.random.multivariate_normal(means[1], covs[1], n_frames)

    fig, ax = plt.subplots(figsize=(8, 6.8))

    def update(frame):
        ax.clear()

        scatter_training_data(ax, alpha=0.10, size=24)

        draw_cov_ellipse(means[0], covs[0], ax, color=COLORS["gen0"])
        draw_cov_ellipse(means[1], covs[1], ax, color=COLORS["gen1"])

        ax.scatter(
            samples0[:frame + 1, 0],
            samples0[:frame + 1, 1],
            marker="x",
            s=68,
            linewidths=1.9,
            color=COLORS["sample0"],
            alpha=0.95
        )

        ax.scatter(
            samples1[:frame + 1, 0],
            samples1[:frame + 1, 1],
            marker="x",
            s=68,
            linewidths=1.9,
            color=COLORS["sample1"],
            alpha=0.95
        )

        style_axis(ax)

        ax.set_title("Sampling from a learned generative model")
        ax.text(
            0.02,
            0.97,
            f"Generated samples: {2 * (frame + 1)}",
            transform=ax.transAxes,
            va="top",
            color=COLORS["muted"],
            fontsize=11
        )

        model_legend(ax, include_gen=True, include_samples=True, loc="lower right")

    animation = FuncAnimation(
        fig,
        update,
        frames=n_frames,
        interval=65,
        repeat=True
    )

    mp4_path = os.path.join(VIDEO_DIR, "01-generative-sampling.mp4")

    animation.save(
        mp4_path,
        writer=FFMpegWriter(
            fps=24,
            bitrate=2400
        )
    )

    plt.close(fig)

    print(f"Saved: {mp4_path}")


save_generative_boundary_learning_video()
save_discriminative_boundary_learning_video()
save_sampling_video()


# ============================================================
# Summary
# ============================================================

print("\nDone.")
print(f"Generative accuracy:     {gen_acc:.3f}")
print(f"Discriminative accuracy: {disc_acc:.3f}")

print("\nSaved files:")
print(f"- {FIG_DIR}")
print(f"- {VIDEO_DIR}")