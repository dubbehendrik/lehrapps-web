import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image

# -----------------------------
# Funktionen für Berechnungen
# -----------------------------

def berechne_omega(n):
    return 2 * np.pi * n / 60

def berechne_filmdicke(V_LK, eta_LK, rho_LK, omega, r, beta_deg):
    beta_rad = np.radians(beta_deg)
    delta = ((3 * V_LK * eta_LK) / (rho_LK * 2 * np.pi * omega**2 * r**2 * np.sin(beta_rad))) ** (1/3)
    return delta * 1e6  # in µm

def berechne_kennzahlen(eta_LK_Pas, rho_LK, sigma_Npm, D_m, V_LK_m3s, omega):
    # Ohnesorge-Zahl (Oh)
    Oh = eta_LK_Pas / np.sqrt(rho_LK * sigma_Npm * D_m)
    
    # Kantenbelastung (Kb)
    Kb = (V_LK_m3s**2 * rho_LK) / (sigma_Npm * D_m**3)
    
    # Weber-Zahl (We)
    We = (omega**2 * D_m**3 * rho_LK) / sigma_Npm
    
    # Betriebskennzahl (B)
    B = (We**0.5) * (Kb**(5/6)) * (Oh**(10/36))
    
    return Oh, Kb, We, B

def log_to_pixel(x_log, y_log, x0_pix, y0_pix, x1_pix, y1_pix):
    # X-Mapping (logarithmisch)
    x_pix = x0_pix + (np.log10(x_log) - np.log10(1e-4)) / (np.log10(1e0) - np.log10(1e-4)) * (x1_pix - x0_pix)
    
    # Y-Mapping (logarithmisch)
    y_pix = y0_pix + (np.log10(y_log) - np.log10(1e-2)) / (np.log10(3) - np.log10(1e-2)) * (y1_pix - y0_pix)
    
    return x_pix, y_pix
# -----------------------------
# App Layout & Benutzeroberfläche
# -----------------------------

st.set_page_config(layout="wide")

# --- Layout: Logo und Titel ---
col_title, col_logo = st.columns([4, 1])
with col_logo:
    st.image("HSE-Logo.jpg", width=1000)

st.title("Zerfallsarten an einer Rotationsglocke")

with st.expander("ℹ️ Hinweise zur Verwendung"):
    st.markdown("""
Diese App berechnet dimensionslose Kennzahlen für die Lackzerstäubung an Rotationsglocken.
Zusätzlich wird die **Filmdicke am Glockenrand (δ)** unter Annahme konstanter Viskosität berechnet.

### Formeln:
""")
    st.markdown("**Ohnesorge-Zahl (Oh):**")
    st.latex(r"Oh = \frac{ \eta_{LK} }{ \sqrt{ \rho_{LK} \cdot \sigma \cdot D } }")

    st.markdown("**Kantenbelastung ($$K_b$$):**")
    st.latex(r"K_{b} = \frac{ \dot{V}_{LK}^2 \cdot \rho_{LK} }{ \sigma \cdot D^3 }")

    st.markdown("**Weber-Zahl (We):**")
    st.latex(r"We = \frac{ \omega^2 \cdot D^3 \cdot \rho_{LK} }{ \sigma }")

    st.markdown("**Betriebskennzahl (B):**")
    st.latex(r"B = We^{1/2} \cdot K_b^{5/6} \cdot Oh^{10/36}")

    st.markdown("**Filmdicke ($$\delta$$):**")
    st.latex(r"\delta = \sqrt[3]{ \frac{3 \cdot \dot{V}_{LK} \cdot \eta_{LK} }{ \rho_{LK} \cdot 2\pi \omega^2 r^2 \cdot \sin(\beta) } }")


    st.markdown("""
Abbildung in Anlehnung an:  
Weckerle, G.: Beschichtung hochwertiger Karosserieoberflächen mit Pulver Slurry, Dissertation, Universität Stuttgart, 2003
""")

# -----------------------------
# Eingabefelder für Parameter
# -----------------------------
col_plot, col_values = st.columns([0.6, 0.4])

with col_values:
    st.subheader("Parameter")

    V_LK = st.number_input(r"Lackvolumenstrom $\dot{V}_{LK}$ [ml/min]", value=50.0, step=10.0, format="%.1f")
    n = st.number_input(r"Drehzahl $n$ [1/min]", value=40000.0, step=1000.0, format="%.1f")
    d = st.number_input(r"Glockendurchmesser $D$ [mm]", value=60.0, step=1.0, format="%.1f")
    beta = st.number_input(r"Konturwinkel $\beta$ [°]", value=55.0, step=1.0, format="%.1f")
    rho_LK = st.number_input(r"Lackdichte $\rho_{LK}$ [kg/m³]", value=1100.0, step=1.0, format="%.1f")
    eta_LK = st.number_input(r"Viskosität $\eta_{LK}$ [mPa·s]", value=30.0, step=1.0, format="%.1f")
    sigma = st.number_input(r"Oberflächenspannung $\sigma$ [mN/m]", value=30.0, step=1.0, format="%.1f")

if any(value <= 0 for value in (V_LK, n, d, rho_LK, eta_LK, sigma)) or not 0 < beta < 180:
    st.error("Volumenstrom, Drehzahl, Durchmesser, Dichte, Viskosität und Oberflächenspannung müssen positiv sein; der Konturwinkel muss zwischen 0° und 180° liegen.")
    st.stop()

# -----------------------------
# Umrechnungen & Berechnungen
# -----------------------------
# Umrechnungen in SI-Einheiten
V_LK_m3s = V_LK / 1e6 / 60  # ml/min -> m³/s
eta_LK_Pas = eta_LK / 1000   # mPa·s -> Pa·s
sigma_Npm = sigma / 1000     # mN/m -> N/m
D_m = d / 1000               # mm -> m
omega = 2 * np.pi * n / 60   # [1/min] -> [1/s]

omega = berechne_omega(n)
r_m = D_m / 2  # Radius für Filmdicke
delta = berechne_filmdicke(V_LK_m3s, eta_LK_Pas, rho_LK, omega, r_m, beta)

# Für Betriebspunkt beliebige v_LK (z.B. Umfangsgeschwindigkeit)
v_LK = omega * r_m

Oh, Kb, We, B = berechne_kennzahlen(eta_LK_Pas, rho_LK, sigma_Npm, D_m, V_LK_m3s, omega)

# -----------------------------
# Anzeige der Ergebnisse
# -----------------------------
st.markdown("### Berechnete Kennzahlen:")

col1, col2 = st.columns(2)

with col1:
    st.latex(f"Oh = {Oh:.2e}")
    st.latex(f"K_b = {Kb:.2e}")
with col2:
    st.latex(f"We = {We:.2e}")
    st.latex(f"B = {B:.2e}")

st.markdown("### Filmdicke am Glockenrand:")
st.latex(f"\\delta = {delta:.2f} \\, \\mu m")

# -----------------------------
# Plot: Diagramm & Betriebspunkt
# -----------------------------
with col_plot:
    fig, ax = plt.subplots(figsize=(10, 6))

    # Das Diagramm gehört zum Repository und ist ohne Netzabruf verfügbar.
    with Image.open("Diagramm.jpg") as diagram:
        ax.imshow(diagram)
    ax.axis('off')  # keine Achsen mehr

    # Betriebspunkt Pixel-Koordinaten berechnen
    x_pix, y_pix = log_to_pixel(Oh, B, 170, 601, 1050, 50)

    # Betriebspunkt plotten
    ax.plot(x_pix, y_pix, 'ro', markersize=10, label="Betriebspunkt", zorder=1)

    st.pyplot(fig)


# --- Feedback & Support ---
st.markdown("""---""")
st.subheader("🛠️ Feedback & Support")

col_fb1, col_fb2 = st.columns(2)

with col_fb1:
    st.markdown("""
    <a href="https://github.com/dubbehendrik/Zerfallsarten/issues/new?template=bug_report.yml" target="_blank">
        <button style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🐞 Bug melden
        </button>
    </a>
    """, unsafe_allow_html=True)

with col_fb2:
    st.markdown("""
    <a href="https://github.com/dubbehendrik/Zerfallsarten/issues/new?template=feature_request.yml" target="_blank">
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
<a href="mailto:hendrik.dubbe@hs-esslingen.de?subject=Anfrage%20zu%20Zerfallsarten-App" 
   style="color: gray; text-decoration: none;">
Prof. Dr.-Ing. Hendrik Dubbe
</a>
</div>
""", unsafe_allow_html=True)
