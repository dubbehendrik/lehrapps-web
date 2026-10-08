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
        <a
          href={`mailto:hendrik.dubbe@hs-esslingen.de?subject=${encodeURIComponent(`Anfrage zu App ${appName}`)}`}
        >
          Prof. Dr.-Ing. Hendrik Dubbe
        </a>
      </footer>
    </>
  );
}
