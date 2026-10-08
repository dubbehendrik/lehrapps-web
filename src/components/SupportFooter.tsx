export function SupportFooter({ appName }: { appName: string }) {
  return (
    <>
      <section className="feedback">
        <h2>Feedback & Support</h2>
        <a href={`mailto:hendrik.dubbe@hs-esslingen.de?subject=${encodeURIComponent(`Anfrage zu App ${appName}`)}`}>
          E-Mail an hendrik.dubbe@hs-esslingen.de
        </a>
      </section>
      <footer>
        <strong>Disclaimer</strong>
        <p>
          Diese Anwendung dient ausschließlich zu Demonstrations- und
          Lehrzwecken. Es wird keine Gewähr für die Richtigkeit, Vollständigkeit
          oder Aktualität der bereitgestellten Inhalte übernommen. Die Nutzung
          erfolgt auf eigene Verantwortung. Eine kommerzielle Verwendung ist
          ausdrücklich nicht gestattet. Für Schäden materieller oder ideeller
          Art, die durch die Nutzung der App entstehen, wird keine Haftung
          übernommen.
        </p>
        <strong>Hinweis zum KI-Einsatz</strong>
        <p>
          Bei der Entwicklung dieser Anwendung wurde OpenAI ChatGPT/Codex
          unterstützend eingesetzt. Die Unterstützung umfasste die Erstellung
          und Überarbeitung des Programmcodes, die Übertragung fachlicher
          Berechnungsverfahren sowie die Erstellung von Tests und erläuternden
          Texten. Die Berechnungen während der Nutzung erfolgen durch den
          implementierten Programmcode; dabei werden <u>keine</u> KI-generierten
          Antworten erzeugt. Die Anwendung wurde anhand automatisierter Tests
          sowie anschließend durch Prof. Dr.-Ing. Hendrik Dubbe in der
          implementierten Form auf Funktionalität und fachliche Korrektheit
          geprüft. Diese Prüfungen beziehen sich auf die untersuchten Testfälle
          und Nutzungsszenarien und gewährleisten keine Fehlerfreiheit für
          sämtliche Eingaben und Anwendungsfälle. Eine Gewähr für die Richtigkeit
          der Ergebnisse wird nicht übernommen.
        </p>
        <a
          href={`mailto:hendrik.dubbe@hs-esslingen.de?subject=${encodeURIComponent(`Anfrage zu App ${appName}`)}`}
        >
          Prof. Dr.-Ing. Hendrik Dubbe
        </a>
      </footer>
    </>
  );
}
