"""
Double-Slit Interference Animations for ECE 109 QM Waves
Uses Text instead of MathTex to avoid LaTeX/dvisvgm dependency issues.

Run individual scenes:
    manim -qm double_slit_manim.py DoubleSlitGeometry
    manim -qm double_slit_manim.py WaveSuperposition
    manim -qm double_slit_manim.py InterferencePattern
Or render all:
    manim -qm double_slit_manim.py
"""

from manim import *
import numpy as np


class DoubleSlitGeometry(Scene):
    """
    Double-slit setup: barrier, two slits, paths to point P,
    path difference, and constructive/destructive conditions.
    P animates along the screen to show changing path difference.
    """

    def construct(self):
        # Layout
        barrier_x = -2.0
        screen_x = 4.0
        slit_sep = 2.0
        slit_half = slit_sep / 2

        title = Text("Double-Slit Geometry", font_size=36, color=WHITE)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title))

        # Barrier with two slits
        barrier_top = Line(
            [barrier_x, 3, 0], [barrier_x, slit_half + 0.15, 0],
            color=GREY, stroke_width=6
        )
        barrier_mid = Line(
            [barrier_x, slit_half - 0.15, 0], [barrier_x, -slit_half + 0.15, 0],
            color=GREY, stroke_width=6
        )
        barrier_bot = Line(
            [barrier_x, -slit_half - 0.15, 0], [barrier_x, -3, 0],
            color=GREY, stroke_width=6
        )
        barrier = VGroup(barrier_top, barrier_mid, barrier_bot)

        s1_dot = Dot([barrier_x, slit_half, 0], color=YELLOW, radius=0.08)
        s2_dot = Dot([barrier_x, -slit_half, 0], color=YELLOW, radius=0.08)
        s1_label = Text("S\u2081", font_size=26, color=YELLOW).next_to(s1_dot, LEFT, buff=0.2)
        s2_label = Text("S\u2082", font_size=26, color=YELLOW).next_to(s2_dot, LEFT, buff=0.2)

        # Slit separation brace
        d_brace = BraceBetweenPoints(
            [barrier_x - 0.6, -slit_half, 0],
            [barrier_x - 0.6, slit_half, 0],
            direction=LEFT, color=GOLD
        )
        d_label = Text("d", font_size=26, color=GOLD).next_to(d_brace, LEFT, buff=0.15)

        # Screen
        screen = Line(
            [screen_x, 2.5, 0], [screen_x, -2.5, 0],
            color=BLUE_B, stroke_width=4
        )
        screen_label = Text("Screen", font_size=22, color=BLUE_B).next_to(screen, RIGHT, buff=0.15)

        self.play(
            Create(barrier), FadeIn(s1_dot), FadeIn(s2_dot),
            Write(s1_label), Write(s2_label),
            Create(screen), Write(screen_label),
            run_time=1.5
        )
        self.play(GrowFromCenter(d_brace), Write(d_label), run_time=0.8)

        # Incoming plane wave arrows
        wave_arrows = VGroup(*[
            Arrow(
                [-4.5, y, 0], [barrier_x - 0.2, y, 0],
                buff=0, color=BLUE_A, stroke_width=2, max_tip_length_to_length_ratio=0.15
            )
            for y in np.linspace(-1.5, 1.5, 5)
        ])
        wave_label = Text("Incident\nplane wave", font_size=18, color=BLUE_A)
        wave_label.move_to([-4.8, 0, 0])
        self.play(FadeIn(wave_arrows), Write(wave_label), run_time=1)

        # Point P on screen
        p_y = 1.5
        p_dot = Dot([screen_x, p_y, 0], color=RED, radius=0.1)
        p_label = Text("P", font_size=28, color=RED).next_to(p_dot, RIGHT, buff=0.15)
        self.play(FadeIn(p_dot), Write(p_label))

        # Paths from S1 and S2 to P
        path_s1 = DashedLine(
            [barrier_x, slit_half, 0], [screen_x, p_y, 0],
            color=GREEN_B, stroke_width=2.5, dash_length=0.1
        )
        path_s2 = DashedLine(
            [barrier_x, -slit_half, 0], [screen_x, p_y, 0],
            color=ORANGE, stroke_width=2.5, dash_length=0.1
        )
        r1_label = Text("r\u2081", font_size=24, color=GREEN_B)
        r1_label.move_to(
            (np.array([barrier_x, slit_half, 0]) + np.array([screen_x, p_y, 0])) / 2
            + np.array([0, 0.35, 0])
        )
        r2_label = Text("r\u2082", font_size=24, color=ORANGE)
        r2_label.move_to(
            (np.array([barrier_x, -slit_half, 0]) + np.array([screen_x, p_y, 0])) / 2
            + np.array([0, -0.35, 0])
        )

        self.play(
            Create(path_s1), Create(path_s2),
            Write(r1_label), Write(r2_label),
            run_time=1.5
        )

        # Theta and central axis
        central_line = DashedLine(
            [barrier_x, 0, 0], [screen_x, 0, 0],
            color=WHITE, stroke_width=1, dash_length=0.15
        )
        theta_arc = Arc(
            radius=1.2, start_angle=0,
            angle=np.arctan2(p_y, screen_x - barrier_x),
            arc_center=[barrier_x, 0, 0],
            color=WHITE, stroke_width=1.5
        )
        theta_label = Text("\u03b8", font_size=24, color=WHITE)
        theta_label.move_to([barrier_x + 1.5, 0.4, 0])

        self.play(
            Create(central_line), Create(theta_arc), Write(theta_label),
            run_time=1
        )

        # Path difference formula
        path_diff_text = Text(
            "\u0394 = r\u2082 \u2212 r\u2081 = d sin\u03b8",
            font_size=26, color=WHITE
        ).to_edge(DOWN, buff=0.5)
        self.play(Write(path_diff_text), run_time=1)

        # Conditions
        constructive = Text(
            "Bright:  \u0394 = n\u03bb   (n = 0, \u00b11, \u00b12, ...)",
            font_size=22, color=GREEN_B
        ).next_to(path_diff_text, UP, buff=0.25)
        destructive = Text(
            "Dark:  \u0394 = (n + \u00bd)\u03bb",
            font_size=22, color=RED_B
        ).next_to(constructive, UP, buff=0.2)

        self.play(Write(constructive), run_time=1)
        self.play(Write(destructive), run_time=1)
        self.wait(2)

        # Animate P sliding along the screen
        self.play(FadeOut(constructive), FadeOut(destructive), FadeOut(path_diff_text))

        def get_updated_group(new_y):
            new_p = Dot([screen_x, new_y, 0], color=RED, radius=0.1)
            new_pl = Text("P", font_size=28, color=RED).next_to(new_p, RIGHT, buff=0.15)
            new_r1 = DashedLine(
                [barrier_x, slit_half, 0], [screen_x, new_y, 0],
                color=GREEN_B, stroke_width=2.5, dash_length=0.1
            )
            new_r2 = DashedLine(
                [barrier_x, -slit_half, 0], [screen_x, new_y, 0],
                color=ORANGE, stroke_width=2.5, dash_length=0.1
            )
            return new_p, new_pl, new_r1, new_r2

        for target_y in [0.0, -1.5, 1.5]:
            new_p, new_pl, new_r1, new_r2 = get_updated_group(target_y)
            self.play(
                Transform(p_dot, new_p),
                Transform(p_label, new_pl),
                Transform(path_s1, new_r1),
                Transform(path_s2, new_r2),
                run_time=1.2
            )
            r1_len = np.linalg.norm(
                np.array([screen_x, target_y, 0]) - np.array([barrier_x, slit_half, 0])
            )
            r2_len = np.linalg.norm(
                np.array([screen_x, target_y, 0]) - np.array([barrier_x, -slit_half, 0])
            )
            delta_val = r2_len - r1_len
            delta_text = Text(
                f"\u0394 = {delta_val:.2f} units",
                font_size=24, color=WHITE
            ).to_edge(DOWN, buff=0.5)
            self.play(Write(delta_text), run_time=0.5)
            self.wait(0.8)
            self.play(FadeOut(delta_text), run_time=0.3)

        self.wait(1)


class WaveSuperposition(Scene):
    """
    Two sinusoidal waves and their sum.
    Phase shifts from 0 (constructive) to pi (destructive),
    then sweeps 0..2pi to show the full range.
    """

    def construct(self):
        title = Text("Wave Superposition", font_size=36, color=WHITE)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title))

        axes = Axes(
            x_range=[0, 4 * PI, PI / 2],
            y_range=[-2.5, 2.5, 1],
            x_length=10, y_length=4,
            axis_config={"color": GREY_B, "stroke_width": 1.5},
        ).shift(DOWN * 0.3)
        x_label = Text("x", font_size=20, color=GREY_A).next_to(axes.x_axis, RIGHT, buff=0.15)
        self.play(Create(axes), Write(x_label), run_time=1)

        phase = ValueTracker(0)

        # Wave 1 (fixed)
        wave1 = always_redraw(lambda: axes.plot(
            lambda x: np.cos(x), x_range=[0, 4 * PI],
            color=GREEN_B, stroke_width=2
        ))
        # Wave 2 (phase shifts)
        wave2 = always_redraw(lambda: axes.plot(
            lambda x: np.cos(x + phase.get_value()), x_range=[0, 4 * PI],
            color=ORANGE, stroke_width=2
        ))
        # Sum
        wave_sum = always_redraw(lambda: axes.plot(
            lambda x: np.cos(x) + np.cos(x + phase.get_value()), x_range=[0, 4 * PI],
            color=YELLOW, stroke_width=3
        ))

        w1_label = Text("cos(x)", font_size=20, color=GREEN_B).to_corner(UL, buff=0.8)
        sum_label = Text("Sum", font_size=20, color=YELLOW).to_corner(UR, buff=0.8)

        # Dynamic label for wave 2
        w2_label = always_redraw(lambda: Text(
            f"cos(x + {phase.get_value():.1f})",
            font_size=20, color=ORANGE
        ).next_to(w1_label, DOWN, buff=0.15, aligned_edge=LEFT))

        self.play(
            Create(wave1), Create(wave2), Create(wave_sum),
            Write(w1_label), Write(sum_label),
            run_time=1.5
        )
        self.add(w2_label)

        # Constructive: phase = 0
        constr_text = Text(
            "Constructive: phase diff = 0, amplitude doubles",
            font_size=22, color=GREEN_B
        ).to_edge(DOWN, buff=0.4)
        self.play(Write(constr_text))
        self.wait(2)
        self.play(FadeOut(constr_text))

        # Animate to destructive: phase = pi
        self.play(phase.animate.set_value(PI), run_time=3, rate_func=smooth)
        destr_text = Text(
            "Destructive: phase diff = \u03c0, complete cancellation",
            font_size=22, color=RED_B
        ).to_edge(DOWN, buff=0.4)
        self.play(Write(destr_text))
        self.wait(2)
        self.play(FadeOut(destr_text))

        # Partial: phase = pi/3
        self.play(phase.animate.set_value(PI / 3), run_time=2, rate_func=smooth)
        partial_text = Text(
            "Partial interference: phase diff = \u03c0/3",
            font_size=22, color=BLUE_B
        ).to_edge(DOWN, buff=0.4)
        self.play(Write(partial_text))
        self.wait(2)
        self.play(FadeOut(partial_text))

        # Sweep 0..2pi
        sweep_text = Text(
            "Sweeping phase difference 0 \u2192 2\u03c0",
            font_size=20, color=WHITE
        ).to_edge(DOWN, buff=0.4)
        self.play(Write(sweep_text))
        self.play(phase.animate.set_value(0), run_time=0.5)
        self.play(phase.animate.set_value(2 * PI), run_time=6, rate_func=linear)
        self.play(FadeOut(sweep_text))

        # Key takeaway
        takeaway = Text(
            "|E\u2081 + E\u2082|\u00b2 \u2260 |E\u2081|\u00b2 + |E\u2082|\u00b2",
            font_size=28, color=RED
        ).to_edge(DOWN, buff=0.5)
        cross_term = Text(
            "The cross term 2E\u2081E\u2082 creates interference",
            font_size=22, color=WHITE
        ).next_to(takeaway, UP, buff=0.15)
        self.play(Write(takeaway), Write(cross_term))
        self.wait(3)


class InterferencePattern(Scene):
    """
    Left: double-slit schematic with expanding wavefronts.
    Right: intensity plot I(y)/I_max showing the cos^2 fringe pattern.
    """

    def construct(self):
        title = Text("Interference Pattern Formation", font_size=34, color=WHITE)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title))

        # Parameters
        lam = 0.5
        d = 2.0
        L = 6.0

        def intensity(y):
            delta = d * y / np.sqrt(y**2 + L**2)
            phi = 2 * PI * delta / lam
            return np.cos(phi / 2) ** 2

        # Left: schematic
        barrier_x = -4.5
        screen_x_left = -1.0
        slit_half = 0.5

        barrier_top = Line([barrier_x, 2.5, 0], [barrier_x, slit_half + 0.1, 0], color=GREY, stroke_width=4)
        barrier_mid = Line([barrier_x, slit_half - 0.1, 0], [barrier_x, -slit_half + 0.1, 0], color=GREY, stroke_width=4)
        barrier_bot = Line([barrier_x, -slit_half - 0.1, 0], [barrier_x, -2.5, 0], color=GREY, stroke_width=4)

        s1 = Dot([barrier_x, slit_half, 0], color=YELLOW, radius=0.06)
        s2 = Dot([barrier_x, -slit_half, 0], color=YELLOW, radius=0.06)

        screen_line = Line([screen_x_left, 2.5, 0], [screen_x_left, -2.5, 0], color=BLUE_B, stroke_width=3)

        self.play(
            Create(VGroup(barrier_top, barrier_mid, barrier_bot)),
            FadeIn(s1), FadeIn(s2),
            Create(screen_line),
            run_time=1
        )

        # Right: intensity plot
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[0, 1.1, 0.5],
            x_length=5, y_length=5,
            axis_config={"color": GREY_B, "stroke_width": 1.5},
            tips=False,
        ).shift(RIGHT * 3.5)
        y_label = Text("I / I_max", font_size=18, color=GREY_A).next_to(axes.y_axis, UP, buff=0.15)
        x_label = Text("y (screen position)", font_size=16, color=GREY_A).next_to(axes.x_axis, DOWN, buff=0.15)
        self.play(Create(axes), Write(y_label), Write(x_label), run_time=1)

        # Intensity curve
        intensity_curve = axes.plot(
            intensity, x_range=[-3, 3],
            color=YELLOW, stroke_width=3
        )
        self.play(Create(intensity_curve), run_time=2)

        # Annotate maxima
        max_dot = Dot(axes.c2p(0, 1), color=GREEN, radius=0.08)
        max_label = Text("n=0", font_size=18, color=GREEN).next_to(max_dot, UP, buff=0.1)
        self.play(FadeIn(max_dot), Write(max_label))

        y_first = lam * L / d  # first-order max position
        for sign in [1, -1]:
            yv = sign * y_first
            dot = Dot(axes.c2p(yv, intensity(yv)), color=GREEN, radius=0.06)
            lab = Text(f"n={1 if sign > 0 else -1}", font_size=16, color=GREEN)
            lab.next_to(dot, UP if sign > 0 else DOWN, buff=0.1)
            self.play(FadeIn(dot), Write(lab), run_time=0.5)

        # First minima
        y_min = lam * L / (2 * d)
        for sign in [1, -1]:
            yv = sign * y_min
            dot = Dot(axes.c2p(yv, intensity(yv)), color=RED, radius=0.06)
            lab = Text("min", font_size=14, color=RED)
            lab.next_to(dot, DOWN if sign > 0 else UP, buff=0.1)
            self.play(FadeIn(dot), Write(lab), run_time=0.5)

        self.wait(1)

        # Emanating wavefronts
        info = Text(
            "Waves from each slit travel different distances to each point",
            font_size=18, color=WHITE
        ).to_edge(DOWN, buff=0.3)
        self.play(Write(info))

        for _ in range(3):
            c1 = Circle(radius=0.1, color=GREEN_B, stroke_width=1.5).move_to(s1)
            c2 = Circle(radius=0.1, color=ORANGE, stroke_width=1.5).move_to(s2)
            self.play(
                c1.animate.scale(25).set_opacity(0),
                c2.animate.scale(25).set_opacity(0),
                run_time=2, rate_func=linear
            )
            self.remove(c1, c2)

        # Formula summary
        self.play(FadeOut(info))
        formula = Text(
            "I(y) = I_max cos\u00b2(\u03c0 d sin\u03b8 / \u03bb)",
            font_size=24, color=WHITE
        ).to_edge(DOWN, buff=0.4)
        where = Text(
            "sin\u03b8 \u2248 y / \u221a(y\u00b2 + L\u00b2)",
            font_size=20, color=GREY_A
        ).next_to(formula, UP, buff=0.15)
        self.play(Write(formula), Write(where))
        self.wait(3)
