import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import UnivariateSpline, interp1d
from io import BytesIO
import requests

st.set_page_config(layout="wide")

# --- Layout: Logo und Titel ---
col_title, col_logo = st.columns([4, 1])
with col_logo:
    st.image("HSE-Logo.jpg", width=1000)

st.title("Vom Einzelstrahl zur Totalbeschichtung")

# --- Hinweise zur Verwendung ---
with st.expander("ℹ️ Hinweise zur Verwendung"):
    st.markdown("""
Diese App dient zur Visualisierung und Analyse eines Einzelstrahls und dem Aufbau der Totalbeschichtungen daraus.

Sie können damit:
- **Eigene Excel-Dateien hochladen** mit einem Einzelstrahlprofil (Ort [mm], Schichtdicke [µm]).
- Oder **Beispieldaten verwenden**, um das Tool ohne eigene Daten zu testen.

Wichtig:
- Sobald eine Excel-Datei geladen wurde, wird diese verwendet.
- Um wieder auf Beispieldaten zu wechseln, musst du die Excel (X) entfernen.

Das Einzelstrahl-Profil kann dann mittels Spline-Interpolation geggättet werden und sas Tool berechnet dann automatisch
- die Maximalhöhe des Einzelstrahls $h_{max}$
- die Halbhöhenbreite $Sb_{50}$
sowie basierend auf einer frei wählbaren Anzahl an Einzelstrahlen und einem vorgegebenen Bahnversatz 
- den Überlappungsgrad $ÜL$
- die mittlere Gesamtschichtdicke $h_{ges}$

Es gibt darüber hinaus die Möglichkeit, die Gesamtschichtdicke manuell zu ermitteln. 
""")

# --- Datei-Upload ---
uploaded_file = st.file_uploader("Lade eine Excel-Datei hoch (Ort [mm], Schichtdicke [µm])", type=["xlsx"])

# --- Upload Handling ---
if uploaded_file is not None and uploaded_file != st.session_state.get("uploaded_file"):
    st.session_state.clear()
    st.session_state.uploaded_file = uploaded_file
    st.session_state.file_to_use = uploaded_file
    st.session_state.source_label = uploaded_file.name
    st.rerun()

# --- Beispiel-Daten Handling ---
if "file_to_use" not in st.session_state:
    st.session_state.file_to_use = None
    st.session_state.source_label = "Keine Datei geladen"

# --- Beispieldaten Buttons ---
col_demo1, col_demo2, col_demo3, col_demo4 = st.columns(4)

with col_demo1:
    if st.button("Beispiel 1"):
        st.session_state.clear()
        url = "https://raw.githubusercontent.com/dubbehendrik/Strahlbreite/main/Exp_Strahlbreite_Profil_ideal.xlsx"
        response = requests.get(url)
        if response.status_code == 200:
            st.session_state.file_to_use = BytesIO(response.content)
            st.session_state.source_label = "Beispiel 1 geladen"
            st.session_state.uploaded_file = None
            st.rerun()

with col_demo2:
    if st.button("Beispiel 2"):
        st.session_state.clear()
        url = "https://raw.githubusercontent.com/dubbehendrik/Strahlbreite/main/Exp_Strahlbreite_Profil_real1.xlsx"
        response = requests.get(url)
        if response.status_code == 200:
            st.session_state.file_to_use = BytesIO(response.content)
            st.session_state.source_label = "Beispiel 2 geladen"
            st.session_state.uploaded_file = None
            st.rerun()

with col_demo3:
    if st.button("Beispiel 3"):
        st.session_state.clear()
        url = "https://raw.githubusercontent.com/dubbehendrik/Strahlbreite/main/Exp_Strahlbreite_Profil_real2.xlsx"
        response = requests.get(url)
        if response.status_code == 200:
            st.session_state.file_to_use = BytesIO(response.content)
            st.session_state.source_label = "Beispiel 3 geladen"
            st.session_state.uploaded_file = None
            st.rerun()

with col_demo4:
    with open("Exp_Strahlbreite_Profil_ideal.xlsx", "rb") as f:
        st.download_button("📥 Template herunterladen", f, file_name="Exp_Strahlbreite_Profil_ideal.xlsx")

# --- Anzeige der aktuellen Datei ---
if st.session_state.get("file_to_use") is not None:
    col_file, col_remove = st.columns([8, 2])
    with col_file:
        st.success(f"{st.session_state.source_label}")
    with col_remove:
        if st.session_state.get("uploaded_file") is None:
            if st.button("❌ Entfernen"):
                st.session_state.clear()
                st.rerun()

# Wenn die Datei gelöscht wird, Session State zurücksetzen
if uploaded_file is None and st.session_state.get("uploaded_file") is not None:
    st.session_state.clear()
    st.rerun()

# Wenn Datei vorhanden: file_to_use > uploaded_file
file_like = st.session_state.get("file_to_use", None)

# Datei einlesen (nur falls nicht schon geladen)
if file_like is not None and "df" not in st.session_state:
    df = pd.read_excel(file_like)
    df = df.iloc[:, :2]  # Nur die ersten beiden Spalten verwenden
    df.columns = ['Ort_mm', 'Dicke_um']
    df = df.dropna().reset_index(drop=True)
    min_len = min(len(df['Ort_mm']), len(df['Dicke_um']))
    df = df.iloc[:min_len]
    st.session_state.df = df

# Wenn Daten vorhanden sind, geht es weiter
if "df" in st.session_state:
    df = st.session_state.df

    # Glättung unterhalb des Einzelstrahl-Plots konfigurieren
    st.markdown("**Glättung des Einzelstrahlprofils**")
    col_spline_slider, col_spline_input = st.columns([0.6, 0.4])

    # Initialisieren (nur wenn noch nicht vorhanden)
    if "spline_smoothness" not in st.session_state:
        st.session_state.spline_smoothness = 0.0
    if "spline_smoothness_input" not in st.session_state:
        st.session_state.spline_smoothness_input = 0.0

    # Synchronisationsfunktionen
    def sync_spline_slider():
        st.session_state.spline_smoothness_input = st.session_state.get("spline_smoothness", 0.0)

    def sync_spline_input():
        st.session_state.spline_smoothness = st.session_state.get("spline_smoothness_input", 0.0)

    # Darstellung
    col_spline_slider, col_spline_input = st.columns([0.6, 0.4])

    with col_spline_slider:
        st.slider("Glättungsfaktor s", min_value=0.0, max_value=20.0,
                  key="spline_smoothness", step=1.0, on_change=sync_spline_slider)

    with col_spline_input:
        st.number_input("Exakter Wert für s", min_value=0.0, max_value=20.0,
                        step=1.0, key="spline_smoothness_input", on_change=sync_spline_input)

    # Interpolation vorbereiten mit Glättung
    x_raw = df['Ort_mm'].values
    y_raw = df['Dicke_um'].values
    x_interp = np.arange(np.min(x_raw), np.max(x_raw), 1.0)
    spline = UnivariateSpline(x_raw, y_raw, s=st.session_state.spline_smoothness)
    y_interp = spline(x_interp)
    
    # --- Hüllkurve gegen Rand-Wiederanstieg (NEU HIER) ---
    def raised_cosine(x, xmin, xmax, edge_fraction=0.1):
        width = xmax - xmin
        edge_width = width * edge_fraction
    
        envelope = np.ones_like(x)
    
        # Links dämpfen
        mask_left = x < xmin + edge_width
        envelope[mask_left] = 0.5 * (1 - np.cos(np.pi * (x[mask_left] - xmin) / edge_width))
    
        # Rechts dämpfen
        mask_right = x > xmax - edge_width
        envelope[mask_right] = 0.5 * (1 - np.cos(np.pi * (xmax - x[mask_right]) / edge_width))
    
        return envelope
    
    # Raised Cosine mit 10% Randdämpfung
    hull = raised_cosine(x_interp, np.min(x_raw), np.max(x_raw), edge_fraction=0.1)
    
    # Dämpfung anwenden
    y_interp *= hull

    # h_max und Sb_50 berechnen
    h_max = np.max(y_interp)
    h_half = h_max / 2
    indices_half = np.where(y_interp >= h_half)[0]
    if len(indices_half) >= 2:
        sb_50 = x_interp[indices_half[-1]] - x_interp[indices_half[0]]
    else:
        sb_50 = np.nan

    # Einzelstrahlplot in 60% der Breite anzeigen
    col_plot, col_text = st.columns([0.6, 0.4])

    with col_plot:
        fig1, ax1 = plt.subplots()
        ax1.plot(x_interp, y_interp, 'k-', label='Interpoliertes Profil')
        ax1.plot(x_raw, y_raw, 'rD', label='Messpunkte')
        ax1.axhline(h_half, color='gray', linestyle='--', label=r'$0.5 \cdot h_{\mathrm{max}}$')
        if len(indices_half) >= 2:
            ax1.axvline(x_interp[indices_half[0]], color='blue', linestyle='--')
            ax1.axvline(x_interp[indices_half[-1]], color='blue', linestyle='--')
        ax1.set_xlabel('Position [mm]')
        ax1.set_ylabel('Schichtdicke [µm]')
        ax1.set_title('Einzelstrahlprofil mit Halbhöhenbreite')
        ax1.legend()
        st.pyplot(fig1)

    with col_text:
        st.latex(r"h_{\mathrm{max}} = " + f"{h_max:.2f} \\, \mu m")
        st.latex(r"Sb_{50} = " + f"{sb_50:.2f} \\, mm")


    # --- Abschnitt 2: Totalbeschichtung ---
    st.subheader("2. Übergang zur Totalbeschichtung")

    col1, col2 = st.columns(2)
    with col1:
        n_bahnen = st.number_input("Anzahl der Einzelstrahlen", min_value=1, max_value=100, value=15, key="n_bahnen")

    max_slider_value = sb_50  # Obergrenze bei ÜL = 0%
    exact_step = max((np.max(x_raw) - np.min(x_raw)) / 100, 0.01)

    if "preset_delta_y" in st.session_state:
        st.session_state["delta_y"] = st.session_state["preset_delta_y"]
        st.session_state["delta_y_input"] = st.session_state["preset_delta_y"]
        del st.session_state["preset_delta_y"]

    if "delta_y" not in st.session_state and not np.isnan(sb_50):
        st.session_state["delta_y"] = sb_50 / 2
    if "delta_y_input" not in st.session_state and not np.isnan(sb_50):
        st.session_state["delta_y_input"] = sb_50 / 2

    def sync_slider():
        st.session_state["delta_y"] = st.session_state.get("delta_y_input", sb_50 / 2)

    def sync_input():
        st.session_state["delta_y_input"] = st.session_state.get("delta_y", sb_50 / 2)

    # Sicherstellen, dass delta_y <= sb_50
    if "delta_y" in st.session_state:
        if st.session_state["delta_y"] > sb_50:
            st.session_state["delta_y"] = sb_50
        if st.session_state["delta_y_input"] > sb_50:
            st.session_state["delta_y_input"] = sb_50
    
    col3, col4 = st.columns([0.6, 0.4])
    with col3:
        slider_val = st.slider("Bahnversatz Δy [mm]", min_value=0.1, max_value=float(max_slider_value),
                               value=st.session_state["delta_y"], key="delta_y", on_change=sync_input)

        col_btn1, col_btn2 = st.columns(2)
        with col_btn1:
            if st.button(f"SET ÜL = 3 (67%)   - {sb_50/3:.2f} mm"):
                st.session_state["preset_delta_y"] = sb_50 / 3
                st.rerun()
        
        with col_btn2:
            if st.button(f"SET ÜL = 2 (50%)   - {sb_50/2:.2f} mm"):
                st.session_state["preset_delta_y"] = sb_50 / 2
                st.rerun()
    
    with col4:
        st.number_input("Exakter Bahnversatz Δy [mm]", min_value=0.1, max_value=float(max_slider_value),
                        step=exact_step, value=st.session_state["delta_y"], key="delta_y_input", on_change=sync_slider)

    delta_y = st.session_state["delta_y"]

    total_x_min = np.min(x_interp)
    total_x_max = np.max(x_interp) + (n_bahnen - 1) * delta_y
    x_total = np.arange(total_x_min, total_x_max, 1.0)
    y_total = np.zeros_like(x_total)

    for i in range(n_bahnen):
        shift = i * delta_y
        x_shifted = x_interp + shift
        y_shifted = y_interp
        y_total += interp1d(x_shifted, y_shifted, bounds_error=False, fill_value=0)(x_total)

    # h_ges automatisch bestimmen
    h_ges_auto = np.mean(y_total[y_total >= 0.95 * np.max(y_total)])
    h_max_total = float(np.max(y_total))
    h_step = h_max_total / 20

    # Initialisierung falls noch nicht vorhanden
    if "manual_h_ges" not in st.session_state:
        st.session_state.manual_h_ges = h_ges_auto
    if "manual_h_ges_input" not in st.session_state:
        st.session_state.manual_h_ges_input = h_ges_auto

    st.session_state.manual_h_ges = min(st.session_state.manual_h_ges, h_max_total)
    st.session_state.manual_h_ges_input = min(st.session_state.manual_h_ges_input, h_max_total)

    def sync_h_slider():
        st.session_state.manual_h_ges = st.session_state.get("manual_h_ges_input", h_ges_auto)

    def sync_h_input():
        st.session_state.manual_h_ges_input = st.session_state.get("manual_h_ges", h_ges_auto)

    auswahl = st.radio("Methode zur Ermittlung der Gesamtschichtdicke h_ges:",
                      [r"Automatisch ($y_{total} \geq 0.95 \cdot h_{max}$)", "Manuell"],
                      index=0)

    col_h1, col_h2 = st.columns([0.6, 0.4])
    with col_h1:
        st.slider(r"$h_{\mathrm{ges}}$ [µm]", min_value=0.0, max_value=h_max_total,
                  value=st.session_state.manual_h_ges,
                  key="manual_h_ges", on_change=sync_h_input, step=None)

    with col_h2:
        st.number_input("", min_value=0.0, max_value=h_max_total,
                        step=h_step, value=st.session_state.manual_h_ges,
                        key="manual_h_ges_input", on_change=sync_h_slider)

    if auswahl == "Manuell":
        h_ges = st.session_state.manual_h_ges
    else:
        h_ges = h_ges_auto

    # Plot
    col_plot2, col_text2 = st.columns([0.6, 0.4])

    with col_plot2:
        fig2, ax2 = plt.subplots()
        tab_colors = [plt.get_cmap('hsv')(i / n_bahnen) for i in range(n_bahnen)]

        for i in range(n_bahnen):
            shift = i * delta_y
            x_shifted = x_interp + shift
            y_shifted = y_interp
            color = tab_colors[i]
            ax2.plot(x_shifted, y_shifted, color=color)
            if i < 2:
                x_rect = shift + x_interp[np.argmax(y_interp)] - sb_50 / 2
                ax2.add_patch(plt.Rectangle((x_rect, 0), sb_50, h_half, linewidth=0.5,
                                            edgecolor=color, facecolor=color, alpha=0.5))

        ax2.plot(x_total, y_total, 'k-', linewidth=2.5, label="Totalbeschichtung")
        ax2.axhline(h_ges, color='gray', linestyle='--', label=rf'$h_{{\mathrm{{ges}}}} = {h_ges:.2f}\,\mu m$')
        ax2.set_xlabel('Position [mm]')
        ax2.set_ylabel('Schichtdicke [µm]')
        ax2.set_title('Totalbeschichtung')
        ax2.legend(loc='upper right')
        st.pyplot(fig2)

    with col_text2:
        overl_percent = ((sb_50 - delta_y) / sb_50) * 100 if sb_50 else np.nan
        overl_dimless = sb_50 / delta_y if sb_50 else np.nan

        st.markdown(f"""
        <div style='font-family: monospace; font-size: 16px; line-height: 1.6;'>
        Überlappungsgrad ÜL [%]:&nbsp;&nbsp;&nbsp;&nbsp;{overl_percent:6.2f} %<br>
        Überlappungsgrad ÜL [-]:&nbsp;&nbsp;&nbsp;&nbsp;{overl_dimless:6.2f}<br>
        Mittlere Schichtdicke h<sub>ges</sub>:&nbsp;{h_ges:6.2f} µm
        </div>
        """, unsafe_allow_html=True)




# --- Feedback & Support ---
st.markdown("""---""")
st.subheader("🛠️ Feedback & Support")

col_fb1, col_fb2 = st.columns(2)

with col_fb1:
    st.markdown("""
    <a href="https://github.com/dubbehendrik/strahlbreite/issues/new?template=bug_report.yml" target="_blank">
        <button style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🐞 Bug melden
        </button>
    </a>
    """, unsafe_allow_html=True)

with col_fb2:
    st.markdown("""
    <a href="https://github.com/dubbehendrik/strahlbreite/issues/new?template=feature_request.yml" target="_blank">
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
<a href="mailto:hendrik.dubbe@hs-esslingen.de?subject=Anfrage%20zu%20Strahlbreite-App" 
   style="color: gray; text-decoration: none;">
Prof. Dr.-Ing. Hendrik Dubbe
</a>
</div>
""", unsafe_allow_html=True)
