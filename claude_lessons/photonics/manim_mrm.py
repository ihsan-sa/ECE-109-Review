"""Micro-Ring Modulator (MRM) Animation -- simplified for fast rendering."""
from manim import *
import numpy as np

GOLD = "#c8a45a"
BLUE = "#4a90d9"
RED = "#e06c75"
GREEN = "#69b578"
DIM = "#6b7084"
BG = "#0a0c10"
PANEL = "#111318"

class MicroRingModulator(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("Micro-Ring Modulator", font_size=32, color=GOLD, weight=BOLD)
        title.to_edge(UP, buff=0.4)
        self.add(title)

        # Device geometry
        bus_wg = Line(LEFT * 5, RIGHT * 5, color=BLUE, stroke_width=4).shift(DOWN * 1.2)
        ring = Circle(radius=1.2, color=GOLD, stroke_width=4).move_to(UP * 0.3)
        input_l = Text("Input", font_size=16, color=BLUE).next_to(bus_wg.get_start(), UP, buff=0.1)
        through_l = Text("Through", font_size=16, color=BLUE).next_to(bus_wg.get_end(), UP, buff=0.1)
        gap_l = Text("gap", font_size=12, color=DIM).move_to(DOWN * 0.45)

        self.play(Create(bus_wg), Create(ring), FadeIn(input_l, through_l, gap_l), run_time=1)

        # Intensity bar
        bar_bg = Rectangle(width=0.3, height=2, color=DIM, stroke_width=1, fill_opacity=0.15)
        bar_bg.next_to(through_l, RIGHT, buff=0.7)
        bar_fill = Rectangle(width=0.3, height=2, color=BLUE, stroke_width=0, fill_opacity=0.7)
        bar_fill.move_to(bar_bg)
        pct = Text("100%", font_size=12, color=BLUE).next_to(bar_bg, RIGHT, buff=0.1)
        self.play(FadeIn(bar_bg, bar_fill, pct), run_time=0.3)

        # Phase 1: Off-resonance -- light passes through
        phase1 = Text("Off-Resonance: light passes through", font_size=18, color=GREEN)
        phase1.to_edge(DOWN, buff=0.4)
        self.play(FadeIn(phase1), run_time=0.3)

        dots = VGroup(*[Dot(radius=0.07, color=BLUE).move_to(bus_wg.get_start() + RIGHT * i * 0.4) for i in range(5)])
        self.play(FadeIn(dots), run_time=0.2)
        self.play(dots.animate.shift(RIGHT * 10), run_time=1.5, rate_func=linear)
        self.remove(dots)
        self.wait(0.3)

        # Phase 2: On-resonance -- light couples into ring
        self.play(FadeOut(phase1), run_time=0.2)
        phase2 = Text("On-Resonance: light trapped in ring", font_size=18, color=RED)
        phase2.to_edge(DOWN, buff=0.4)
        self.play(FadeIn(phase2), run_time=0.3)

        ring_dots = VGroup(*[
            Dot(radius=0.05, color=GOLD).move_to(ring.get_center() + 1.2 * np.array([np.cos(i * TAU / 8), np.sin(i * TAU / 8), 0]))
            for i in range(8)
        ])
        new_bar = bar_fill.copy().stretch_to_fit_height(0.15).align_to(bar_bg, DOWN)
        new_pct = Text("5%", font_size=12, color=RED).next_to(bar_bg, RIGHT, buff=0.1)

        self.play(
            FadeIn(ring_dots),
            ring.animate.set_color(RED).set_stroke(width=6),
            Transform(bar_fill, new_bar),
            Transform(pct, new_pct),
            run_time=0.8
        )
        self.play(Rotate(ring_dots, TAU * 2, about_point=ring.get_center()), run_time=2, rate_func=linear)

        # Resonance equation
        eq = MathTex(r"m\lambda = 2\pi R \, n_{\text{eff}}", font_size=28, color=GOLD)
        eq.to_corner(UR, buff=0.4)
        eq_box = SurroundingRectangle(eq, color=GOLD, buff=0.12, stroke_width=1)
        self.play(Write(eq), Create(eq_box), run_time=0.6)
        self.wait(0.5)

        # Phase 3: Apply voltage -- shift resonance
        self.play(FadeOut(phase2), run_time=0.2)
        phase3 = Text("Apply V: plasma dispersion shifts resonance", font_size=18, color=GREEN)
        phase3.to_edge(DOWN, buff=0.4)

        v_label = Text("V", font_size=22, color=RED, weight=BOLD).move_to(ring.get_center() + UP * 0.5)
        dn_eq = MathTex(r"\Delta n \propto -\Delta N_e / m_e^*", font_size=22, color=RED)
        dn_eq.next_to(eq, DOWN, buff=0.4)

        new_bar2 = bar_fill.copy().stretch_to_fit_height(1.8).align_to(bar_bg, DOWN)
        new_pct2 = Text("90%", font_size=12, color=GREEN).next_to(bar_bg, RIGHT, buff=0.1)

        self.play(
            FadeIn(phase3, v_label), Write(dn_eq),
            ring.animate.set_color(GOLD).set_stroke(width=4),
            FadeOut(ring_dots),
            Transform(bar_fill, new_bar2),
            Transform(pct, new_pct2),
            run_time=1
        )

        green_dots = VGroup(*[Dot(radius=0.07, color=GREEN).move_to(bus_wg.get_start() + RIGHT * i * 0.4) for i in range(5)])
        self.play(FadeIn(green_dots), run_time=0.2)
        self.play(green_dots.animate.shift(RIGHT * 10), run_time=1.5, rate_func=linear)
        self.remove(green_dots)
        self.wait(0.3)

        # Phase 4: OOK modulation
        self.play(FadeOut(phase3), run_time=0.2)
        mod = Text("OOK Modulation", font_size=20, color=GOLD, weight=BOLD)
        mod.to_edge(DOWN, buff=0.4)
        self.play(FadeIn(mod), run_time=0.3)

        bits = [1, 0, 1, 1, 0, 1, 0, 0]
        bw = 0.55
        bit_rects = VGroup()
        for i, b in enumerate(bits):
            r = Rectangle(width=bw, height=0.35 if b else 0.04, color=GREEN if b else RED,
                          fill_opacity=0.6, stroke_width=1)
            r.move_to(LEFT * 2.2 + RIGHT * i * bw + DOWN * 2.7)
            r.align_to(DOWN * 2.9, DOWN)
            bit_rects.add(r)
            lbl = Text(str(b), font_size=11, color=WHITE).move_to(r.get_center() + UP * 0.3)
            bit_rects.add(lbl)

        self.play(FadeIn(bit_rects), run_time=0.5)

        for b in bits:
            if b == 0:
                nb = bar_fill.copy().stretch_to_fit_height(0.1).align_to(bar_bg, DOWN)
                self.play(ring.animate.set_color(RED).set_stroke(width=6),
                          Transform(bar_fill, nb), run_time=0.2)
            else:
                nb = bar_fill.copy().stretch_to_fit_height(1.8).align_to(bar_bg, DOWN)
                self.play(ring.animate.set_color(GOLD).set_stroke(width=4),
                          Transform(bar_fill, nb), run_time=0.2)

        # Specs
        specs = VGroup(
            Text("R ~ 5 um  |  < 1 ns  |  ~50 fJ/bit", font_size=14, color=GOLD),
        )
        specs.to_corner(DL, buff=0.4)
        sb = SurroundingRectangle(specs, color=GOLD, buff=0.12, stroke_width=1, fill_color=PANEL, fill_opacity=0.8)
        self.play(FadeIn(sb, specs), run_time=0.5)
        self.wait(1.5)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)


class MRMTransmissionShift(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("MRM: Resonance Shift", font_size=28, color=GOLD, weight=BOLD)
        title.to_edge(UP, buff=0.3)
        self.add(title)

        ax = Axes(x_range=[1540, 1560, 5], y_range=[0, 1.1, 0.2],
                  x_length=8, y_length=4,
                  axis_config={"color": DIM, "include_numbers": True, "font_size": 18},
                  x_axis_config={"numbers_to_include": [1540, 1545, 1550, 1555, 1560]},
                  y_axis_config={"numbers_to_include": [0, 0.5, 1.0]}).shift(DOWN * 0.3)
        xl = Text("Wavelength (nm)", font_size=14, color=DIM).next_to(ax.x_axis, DOWN, buff=0.25)
        yl = Text("T", font_size=14, color=DIM).next_to(ax.y_axis, LEFT, buff=0.2)
        self.play(Create(ax), FadeIn(xl, yl), run_time=0.8)

        def lor(lam, lam0, d=0.95, g=0.4):
            return 1 - d / (1 + ((lam - lam0) / g) ** 2)

        c0 = ax.plot(lambda x: lor(x, 1550), x_range=[1540, 1560, 0.1], color=BLUE, stroke_width=3)
        l0 = Text("V = 0", font_size=14, color=BLUE).move_to(ax.c2p(1553, 0.25))
        self.play(Create(c0), FadeIn(l0), run_time=0.8)

        # CW laser line
        cw = DashedLine(ax.c2p(1550, 0), ax.c2p(1550, 1.1), color=GOLD, stroke_width=2, dash_length=0.08)
        cwl = Text("CW laser", font_size=12, color=GOLD).next_to(cw, UP, buff=0.05)
        d0 = Dot(ax.c2p(1550, lor(1550, 1550)), radius=0.07, color=RED)
        t0 = Text("T=5%", font_size=12, color=RED).next_to(d0, LEFT, buff=0.15)
        self.play(Create(cw), FadeIn(cwl, d0, t0), run_time=0.6)
        self.wait(0.5)

        # Shifted curve
        c1 = ax.plot(lambda x: lor(x, 1547), x_range=[1540, 1560, 0.1], color=GREEN, stroke_width=3)
        l1 = Text("V = Vpi", font_size=14, color=GREEN).move_to(ax.c2p(1544, 0.25))
        d1 = Dot(ax.c2p(1550, lor(1550, 1547)), radius=0.07, color=GREEN)
        t1 = Text("T=95%", font_size=12, color=GREEN).next_to(d1, RIGHT, buff=0.15)
        arr = Arrow(ax.c2p(1550, 0.12), ax.c2p(1547, 0.12), color=RED, stroke_width=2, buff=0.05)
        dl = MathTex(r"\Delta\lambda", font_size=22, color=RED).next_to(arr, DOWN, buff=0.08)

        self.play(Create(c1), FadeIn(l1, d1, t1), GrowArrow(arr), Write(dl), run_time=1.2)

        eq = MathTex(r"\Delta\lambda = \frac{\lambda}{n_g}\Delta n_{\text{eff}}", font_size=24, color=GOLD)
        eq.to_corner(DR, buff=0.4)
        eb = SurroundingRectangle(eq, color=GOLD, buff=0.1, stroke_width=1, fill_color=PANEL, fill_opacity=0.8)
        self.play(FadeIn(eb, eq), run_time=0.6)

        # Modulation flash
        for _ in range(4):
            self.play(d0.animate.set_color(RED).scale(1.2), d1.animate.set_opacity(0.2), run_time=0.2)
            self.play(d0.animate.scale(1/1.2), run_time=0.1)
            self.play(d1.animate.set_color(GREEN).set_opacity(1).scale(1.2), d0.animate.set_opacity(0.2), run_time=0.2)
            self.play(d1.animate.scale(1/1.2), run_time=0.1)

        self.wait(1)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)
