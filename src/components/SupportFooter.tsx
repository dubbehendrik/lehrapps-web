export function SupportFooter({ appName }: { appName: string }) {
  return (
    <>
      <section className="feedback">
        <h2>Feedback & Support</h2>
        <a
          href="https://github.com/dubbehendrik/lehrapps-web/issues/new?template=bug_report.yml"
          target="_blank"
          rel="noreferrer"
        >
          Fehler melden
        </a>
        <a
          href="https://github.com/dubbehendrik/lehrapps-web/issues/new?template=feature_request.yml"
          target="_blank"
          rel="noreferrer"
        >
          Funktion anfragen
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
        <a
          href={`mailto:hendrik.dubbe@hs-esslingen.de?subject=Anfrage%20zu%20${encodeURIComponent(appName)}-App`}
        >
          Prof. Dr.-Ing. Hendrik Dubbe
        </a>
      </footer>
    </>
  );
}
