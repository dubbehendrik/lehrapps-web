import { type ReactNode } from 'react';
import { math as m } from '../../components/MathNotation';
import { dot, flow, power, Symbol, Formula } from './Notation';
const c = (i: string) => m.index('c', i);
const sk = m.index('S', 'k');
const eq = m.operator('=');
const minus = m.operator('−');
const plus = m.operator('+');
const times = m.operator('·');
const bracket = (...children: ReactNode[]) => m.row(m.operator('('), ...children, m.operator(')'));
export function ApproximationFormula() {
  return <Formula label="Näherung des Spülverhältnisses mit belastetem Frischwasser">
    {m.row(m.identifier('R'), m.operator('≈'), power(bracket(m.fraction(m.row(c('0'), minus, c('VE')), m.row(m.fraction(c('0'), sk), minus, c('VE')))), m.fraction(m.number('1'), m.identifier('N'))))}
  </Formula>;
}
export function ProgramDescription() {
  return <details><summary>Programmbeschreibung</summary>
    <h2>Ansatz und Bedienung</h2>
    <p>Das Programm berechnet die stationären Konzentrationen und den Frischwasserbedarf einer Gegenstrom-Spülkaskade. Bauteile durchlaufen die Becken von Stufe 1 bis Stufe N. Das Frischwasser wird der letzten Stufe zugeführt und gelangt über die Überläufe entgegen der Bauteilbewegung zur ersten Stufe.</p>
    <p>Mit − und + ändern Sie die Anzahl der Spülstufen von 1 bis 8. Geben Sie die gesamte benetzte Oberfläche je Bauteil, den Durchsatz, die spezifische Verschleppung sowie die Eingangs- und Frischwasserkonzentration vor. Ein gemeinsam gespültes Paket kann als ein Bauteil gezählt werden; dann werden seine gesamte benetzte Oberfläche und der Paketdurchsatz eingesetzt.</p>
    <p>In der Betriebsart „Spülkriterium vorgeben“ wird der erforderliche Frischwasserstrom berechnet; der Stufenvergleich zeigt die Wassereinsparung bei gleichem Spülziel. In der Betriebsart „Frischwasserstrom vorgeben“ werden die Endkonzentration und das erreichte Spülkriterium berechnet; der Stufenvergleich zeigt die Spülwirkung bei gleichem Wasserstrom.</p>
    <p>Das Fließbild zeigt Ströme und Konzentrationen. Wählen Sie ein Becken, um seine Volumen- und Schmutzmassenbilanz zu betrachten. Diagramme und Tabellen ergänzen die Auswertung; die Ergebnisse können als CSV heruntergeladen werden.</p>
    <h2>Instationärer Modus</h2>
    <p>Dieser Modus berechnet aufeinanderfolgende Bauteile und die Anlaufphase. Zusätzlich werden das Flüssigkeitsvolumen je Becken, die Anfangskonzentration aller Becken und die Anzahl der ausgewerteten Bauteile vorgegeben. Die Beckenvolumina sind gleich. Der Frischwasserstrom ist vorgegeben; beim Umschalten wird der zuletzt stationär berechnete Strom übernommen.</p>
    <p>Der Durchsatz bestimmt die Zeit zwischen zwei Wechseln. Die Anlage ist zunächst ohne Bauteile. Beim synchronen Wechsel verlassen vorhandene Bauteile ihre Stufe mit einem Flüssigkeitsfilm in der aktuellen Beckenkonzentration, rücken weiter und ein neues Bauteil tritt ein. Der Film wird dem Herkunftsbecken entnommen und im Zielbecken vollständig eingemischt. Zusätzliche Flüssigkeit beim anfänglichen Füllen der Anlage wird über die Gegenstromüberläufe abgeführt. Das Flüssigkeitsvolumen muss größer als das Filmvolumen sein.</p>
    <p>Zwischen den Wechseln werden die Konzentrationsänderungen durch den kontinuierlichen Frischwasser- und Gegenstromfluss berechnet. Verweil- und Transportzeiten werden nicht separat vorgegeben: jedes Bauteil verbleibt einen Wechselabstand in jeder Stufe, der Transport wird als unmittelbar angenommen.</p>
    <p>Zwischen zwei Wechseln gilt für ein Becken i mit Flüssigkeitsvolumen <Symbol base="V" index="B" />:</p>
    <Formula label="Instationäre Beckenbilanz zwischen den Bauteilwechseln">{m.row(m.index('V', 'B'), times, m.fraction(m.row(m.identifier('d'), c('i')), m.row(m.identifier('d'), m.identifier('t'))), eq, flow('VE'), times, bracket(c('i+1'), minus, c('i')))}</Formula>
    <p>Für die letzte Stufe ist die eingehende Wasserkonzentration die Frischwasserkonzentration. Die Wasserbilanz wird zwischen den Wechseln analytisch integriert; die Bauteilwechsel werden separat bilanziert.</p>
    <p>Wählen Sie ein Bauteil über die Nummer oder den Schieberegler. Sein Konzentrationsverlauf erscheint schwarz mit Punkten, weitere Verläufe hellgrau und die kontinuierliche stationäre Referenz blau gestrichelt. Bei vielen Bauteilen wird eine repräsentative Auswahl grauer Profile dargestellt; alle Bauteile bleiben auswählbar. Das zweite Diagramm zeigt die Endkonzentration über der Bauteilnummer.</p>
    <p>Der Bauteilverlauf zeigt Filmkonzentrationen beim Austritt aus den einzelnen Stufen, also zu unterschiedlichen Zeitpunkten. Das Fließbild darunter zeigt dagegen alle Beckenkonzentrationen zum selben Zeitpunkt unmittelbar vor dem Endaustritt des ausgewählten Bauteils.</p>
    <p>Streng genommen wird bei diskretem Bauteiltransport ein periodisch eingeschwungener Zustand erreicht: Konzentrationen springen beim Wechsel und ändern sich zwischen den Wechseln. Die stationäre Rechnung verwendet kontinuierlich gemittelte Verschleppungsströme. Ihre Ergebnisse sind deshalb eine Referenz, die bei kleinem Filmvolumen gegenüber dem Beckenvolumen nahe am diskreten Ergebnis liegt, aber nicht zwingend identisch ist.</p>
    <p>Die Anzeige eines nahezu wiederkehrenden Zustands prüft alle Beckenkonzentrationen bei gleicher Zyklusphase über die letzten zehn Bauteilwechsel. Als Grenze wird eine Änderung von 0,001 % der größten vorgegebenen Konzentration verwendet. Kleine Änderungen sind kein Beweis für das Erreichen des Grenzzustands; insbesondere bei sehr großen Becken können mehr Durchläufe erforderlich sein.</p>
    <h2>Bezeichnungen und Stromrichtungen</h2>
    <p><Symbol base="c" index="i" /> bezeichnet die Beckenkonzentration. Bei Stromindizes steht zuerst die Herkunft, dann das Ziel: 12 bedeutet von Stufe 1 nach 2, 21 von Stufe 2 nach 1. Wegen idealer Durchmischung gilt:</p>
    <Formula label="Konzentrationen der Ströme entsprechen der jeweiligen Herkunftsstufe">{m.row(c('12'), eq, c('1'), m.operator(','), m.text('  '), c('21'), eq, c('2'))}</Formula>
    <p>Der Verschleppungsstrom <MathInlineFlow index="A" /> ist an allen Übergängen gleich. Auch alle Überläufe entsprechen dem Frischwasserstrom <MathInlineFlow index="VE" />. Der Flüssigkeitsfilm nach der letzten Stufe ist ein eigener Austrag neben dem Abwasser aus Stufe 1.</p>
    <h2>Stationäres Idealmodell</h2>
    <p>Alle Becken sind ideal durchmischt. Der ausgetragene Flüssigkeitsfilm nimmt die Konzentration des jeweiligen Beckens an. Die Flüssigkeit ist inkompressibel; ihre Dichte wird als näherungsweise gleich angenommen. Verdunstung, Reaktion und zusätzliche Flüssigkeitsverluste werden vernachlässigt.</p>
    <p>Die Eingangskonzentration <Symbol base="c" index="0" /> beschreibt Schmutz in der mitgeführten Flüssigkeit, keine unabhängig auf der Oberfläche haftende Schmutzmasse. Beckenvolumen, Bauteilmasse, Verweilzeit und Transportzeit gehen in das stationäre Modell nicht ein. Der Durchsatz wird direkt vorgegeben.</p>
    <h2>Berechnung</h2>
    <Formula label="Verschleppungsstrom gleich Oberfläche mal spezifische Verschleppung mal Durchsatz geteilt durch 60000">{m.row(flow('A'), eq, m.fraction(m.row(m.identifier('A'), times, m.index('v', 'A'), times, dot('n')), m.number('60000')))}</Formula>
    <p>Für diese Einheitenumrechnung wird A in m², <Symbol base="v" index="A" /> in ml/m² und der Durchsatz in 1/h eingesetzt. Das Ergebnis ist der Verschleppungsstrom in L/min.</p>
    <Formula label="Spülverhältnis und Spülkriterium">{m.row(m.identifier('R'), eq, m.fraction(flow('VE'), flow('A')), m.operator(','), m.text('  '), sk, eq, m.fraction(c('0'), c('N')))}</Formula>
    <p>Die vollständige Schmutzmassenbilanz einer inneren Stufe i lautet:</p>
    <Formula label="Allgemeine Schmutzmassenbilanz einer inneren Stufe">{m.row(flow('A'), c('i−1,i'), plus, flow('i+1,i'), c('i+1,i'), minus, flow('A'), c('i,i+1'), minus, flow('i,i−1'), c('i,i−1'), eq, m.number('0'))}</Formula>
    <p>In der ersten Stufe wird der Überlauf durch den Abwasserablauf ersetzt, in der letzten Stufe stammt der Wasserzulauf aus dem Frischwasser.</p>
    <Formula label="Geometrische Summe">{m.row(m.index('S', 'j'), eq, m.number('1'), plus, m.identifier('R'), plus, m.operator('…'), plus, power(m.identifier('R'), m.identifier('j')))}</Formula>
    <Formula label="Konzentration jeder Spülstufe">{m.row(c('i'), eq, c('VE'), plus, bracket(c('0'), minus, c('VE')), times, m.fraction(m.index('S', 'N−i'), m.index('S', 'N')))}</Formula>
    <p>Für unbelastetes Frischwasser folgt:</p>
    <Formula label="Spülkriterium bei unbelastetem Frischwasser">{m.row(sk, eq, m.index('S', 'N'), eq, m.number('1'), plus, m.identifier('R'), plus, m.operator('…'), plus, power(m.identifier('R'), m.identifier('N')))}</Formula>
    <p>Für R = 1 gilt der folgende Sonderfall; bei Frischwasserstrom 0 findet stationär keine Verdünnung statt:</p>
    <Formula label="Konzentration für Spülverhältnis eins">{m.row(c('i'), eq, c('VE'), plus, bracket(c('0'), minus, c('VE')), times, m.fraction(m.row(m.identifier('N'), minus, m.identifier('i'), plus, m.number('1')), m.row(m.identifier('N'), plus, m.number('1'))))}</Formula>
    <p>Bei belastetem Frischwasser mit <Symbol base="c" index="VE" /> kleiner als <Symbol base="c" index="0" /> muss das geforderte Spülkriterium unter der asymptotischen Obergrenze liegen:</p>
    <Formula label="Erreichbarkeitsgrenze bei belastetem Frischwasser">{m.row(sk, m.operator('<'), m.fraction(c('0'), c('VE')))}</Formula>
    <p>Ein Ziel genau an dieser Grenze würde einen unendlich großen Frischwasserstrom erfordern. Der Mindestwasserstrom wird numerisch aus der vollständigen Bilanz berechnet.</p>
    <h2>Näherung</h2>
    <p>Für hinreichend großes R können die kleineren Potenzen in der Summe vernachlässigt werden. Bei unbelastetem Frischwasser gilt:</p>
    <Formula label="Näherung bei unbelastetem Frischwasser">{m.row(m.identifier('R'), m.operator('≈'), power(sk, m.fraction(m.number('1'), m.identifier('N'))))}</Formula>
    <p>Bei belastetem Frischwasser wird die Konzentrationsdifferenz zum Frischwasser berücksichtigt:</p>
    <ApproximationFormula />
    <p>Die Näherung überschätzt den Mindestwasserbedarf. Ein großes Spülkriterium allein garantiert bei vielen Stufen noch keine gute Näherung.</p>
  </details>;
}
import { MathExpression } from '../../components/MathNotation';
function MathInlineFlow({ index }: { index: string }) { return <MathExpression label={`Volumenstrom ${index}`}>{flow(index)}</MathExpression>; }
