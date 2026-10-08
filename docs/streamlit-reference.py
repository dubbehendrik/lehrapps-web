import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from scipy.special import ndtr

st.session_state.setdefault("a_input", -1.96)
st.session_state.setdefault("b_input", 1.96)

st.set_page_config(layout="wide")

# --- Layout: Logo und Titel ---
col_title, col_logo = st.columns([4, 1])
with col_logo:
    st.image("HSE-Logo.jpg", width=1000)

st.title("Berechnung der Bereichswahrscheinlichkeit unter der Standardnormalverteilung")

# ========== Beschreibung und Formeln ==========
with st.expander("ℹ️ Hinweise zur Verwendung"):
    st.markdown(r"""
Die App berechnet die **Bereichswahrscheinlichkeit** unter der Standardnormalverteilung (SNV).  
Dabei wird die Fläche unter der Dichtefunktion $$\varphi_z(z)$$ zwischen zwei Grenzen $$a$$ und $$b$$ bestimmt:

$$
\varphi_z(z) = \frac{1}{\sqrt{2\pi}} \cdot e^{-\frac{z^2}{2}}
$$

Die zugehörige **Verteilungsfunktion** lautet:

$$
\Phi_z(z) = \int_{-\infty}^{z} \varphi_z(u)\; du
$$

Die Wahrscheinlichkeit im Intervall $$[a, b]$$ ergibt sich dann zu:

$$
P(a \leq Z \leq b) = \Phi_z(b) - \Phi_z(a)
$$

Nutzen Sie den Schieberegler oder die Eingabefelder, um die Grenzen $$a$$ und $$b$$ zu setzen.
""", unsafe_allow_html=True)
    
# === Standardnormalverteilung vorbereiten ===
randWert = 6
dSchritt = 0.001
x = np.arange(-randWert, randWert, dSchritt)
phi = (2 * np.pi) ** -0.5 * np.exp(-0.5 * x**2)
cumprob = ndtr(x)

# === Initialisierung ===
if "a" not in st.session_state: st.session_state.a = -1.96
if "b" not in st.session_state: st.session_state.b = 1.96

# === Synchronisierungs-Logik ===
def update_from_input():
    st.session_state.a = st.session_state.a_input
    st.session_state.b = st.session_state.b_input

def update_from_slider():
    st.session_state.a = st.session_state.slider_vals[0]
    st.session_state.b = st.session_state.slider_vals[1]
    st.session_state.a_input = st.session_state.a
    st.session_state.b_input = st.session_state.b

# === Eingabefelder ===
col_a, col_b = st.columns(2)
with col_a:
    st.number_input("Untere Grenze a", min_value=-6.0, max_value=6.0, step=0.01,
                    key="a_input", on_change=update_from_input)
with col_b:
    st.number_input("Obere Grenze b", min_value=-6.0, max_value=6.0, step=0.01,
                    key="b_input", on_change=update_from_input)

# === Bereichsslider ===
st.slider("Wähle den Bereich [a, b]", min_value=-6.0, max_value=6.0,
          value=(st.session_state.a, st.session_state.b), step=0.01,
          key="slider_vals", on_change=update_from_slider)
    
# === Wahrscheinlichkeiten berechnen ===
a = st.session_state.a
b = st.session_state.b
phi_a = ndtr(a)
phi_b = ndtr(b)
prob = phi_b - phi_a

# === Plots ===
col1, col2 = st.columns(2)

# --- Plot 1: Dichtefunktion ---
with col1:
    fig1, ax1 = plt.subplots()
    ax1.plot(x, phi, color="blue", lw=2)
    ax1.fill_between(x, phi, 0, where=(x >= a) & (x <= b), color="green", alpha=0.3)
    ax1.axvline(a, color="gray", linestyle="--")
    ax1.axvline(b, color="gray", linestyle="--")
    ax1.set_xlabel("z")
    ax1.set_ylabel(r"Dichtefunktion $\varphi_{z}(z)$")
    ax1.set_title("Dichtefunktion")
    ax1.grid(True, which='both', linestyle='--', color='lightgray', linewidth=0.5)
    st.pyplot(fig1)

# --- Plot 2: Verteilungsfunktion ---
with col2:
    fig2, ax2 = plt.subplots()
    ax2.plot(x, cumprob, color="blue", lw=2)
    ax2.set_ylim(-0.05, 1.05)

    # Vertikale Linien: nur bis zum Punkt
    ax2.plot([a, a], [0, phi_a], color="green", linestyle="--")
    ax2.plot([b, b], [0, phi_b], color="green", linestyle="--")

    # Horizontale Linien: nur bis zum Punkt
    ax2.plot([-6, a], [phi_a, phi_a], color="green", linestyle="--")
    ax2.plot([-6, b], [phi_b, phi_b], color="green", linestyle="--")
    
    ax2.plot(a, phi_a, 'go')
    ax2.plot(b, phi_b, 'go')
    ax2.plot(0, 0.5, 'o', color='blue', markersize=6, label="Wendepunkt (0, 0.5)")
    ax2.text(a, phi_a + 0.03, f"{phi_a:.4f}", ha='center',
             bbox=dict(facecolor='white', edgecolor='none', boxstyle='round,pad=0.3'))
    ax2.text(b, phi_b + 0.03, f"{phi_b:.4f}", ha='center',
             bbox=dict(facecolor='white', edgecolor='none', boxstyle='round,pad=0.3'))
    ax2.set_xlabel("z")
    ax2.set_ylabel(r"Verteilungsfunktion $\Phi_{z}(z)$")
    ax2.set_title("Verteilungsfunktion")
    ax2.grid(True, which='both', linestyle='--', color='lightgray', linewidth=0.5)
    st.pyplot(fig2)
    
#st.latex(f"P({a:.2f} \\leq Z \\leq {b:.2f}) = \\Phi({b:.2f}) - \\Phi({a:.2f}) = {phi_b:.4f} - {phi_a:.4f} = \\underline{{\\underline{{{prob:.4f}}}}}")

st.latex(rf"""
\begin{{align*}}
P({a:.2f} \leq z \leq {b:.2f})
&= \Phi({b:.2f}) - \Phi({a:.2f}) \\
&= {phi_b:.4f} - {phi_a:.4f} \\
&= \underline{{\underline{{{prob:.4f}}}}}
\end{{align*}}
""")

# --- Feedback & Support ---
st.markdown("""---""")
st.subheader("🛠️ Feedback & Support")

col_fb1, col_fb2 = st.columns(2)

with col_fb1:
    st.markdown("""
    <a href="https://github.com/dubbehendrik/Standardnormalverteilung/issues/new?template=bug_report.yml" target="_blank">
        <button style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🐞 Bug melden
        </button>
    </a>
    """, unsafe_allow_html=True)

with col_fb2:
    st.markdown("""
    <a href="https://github.com/dubbehendrik/Standardnormalverteilung/issues/new?template=feature_request.yml" target="_blank">
        <button style="padding: 0.5rem 1rem; background-color: #2ecc71; color: white; border: none; border-radius: 5px; cursor: pointer;">
            ✨ Feature anfragen
        </button>
    </a>
    """, unsafe_allow_html=True)

# --- Disclaimer ---
st.markdown("""---""")
st.markdown("""
<div style="font-size: 0.5rem; color: gray; text-align: center; line-height: 1.4;">
<b>Disclaimer:</b><br>
Diese Anwendung dient ausschließlich zu Demonstrations- und Lehrzwecken. 
Es wird keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Inhalte übernommen.<br>
Die Nutzung erfolgt auf eigene Verantwortung.<br>
Eine kommerzielle Verwendung ist ausdrücklich nicht gestattet.<br>
Für Schäden materieller oder ideeller Art, die durch die Nutzung der App entstehen, wird keine Haftung übernommen.
<br><br>
<a href="mailto:hendrik.dubbe@hs-esslingen.de?subject=Anfrage%20zu%20Standardnormalverteilung-App" 
   style="color: gray; text-decoration: none;">
Prof. Dr.-Ing. Hendrik Dubbe
</a>
</div>
""", unsafe_allow_html=True)
