"""Extract the verified PDF vector strokes. Usage: python scripts/extract-spray.py dissertation.pdf (PyMuPDF required)."""
import fitz,json,hashlib
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
pdf=Path(sys.argv[1]); doc=fitz.open(pdf)
# Verified axes and vector stroke identities; PDF pages use one-based indexing.
selections=[('measured',223,118,80),('distanceLow',225,324,70),('distanceBase',225,325,70),('distanceHigh',225,326,70),('airLow',225,491,70),('airBase',225,492,70),('airHigh',225,493,70),('flowLow',226,157,70),('flowBase',226,158,70),('flowHigh',226,159,70),('voltageLow',226,324,70),('voltageBase',226,325,70),('voltageHigh',226,326,70),('rpmLow',226,491,70),('rpmBase',226,492,70),('rpmHigh',226,493,70)]
out={'source':{'author':'Nico Güttler','year':2024,'title':'Methodik für numerische Lackiersimulationen: Bedeutung der Modell- und Eingangsparameter bei der Hochrotationszerstäubung','doi':'10.24406/publica-3168','pdfSha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'reference':'ABB RB1000 SSD, Brush 1; Tables 3.2, 3.4; Figure A.1; Figures A.7–A.11','note':'A.8 varies BOTH shaping-air streams together by ±10%. Independent decomposition is a teaching assumption using Table 5.4 width slopes.'},'curves':{}}
# DOI omitted unless verified from document metadata/text.
out['source'].pop('doi')
for name,pg,idx,ylim in selections:
 drawings=doc[pg-1].get_drawings(); dr=drawings[idx]
 # Locate enclosing plotting rectangle among preceding strokes.
 boxes=[d['rect'] for d in drawings[:idx] if any(it[0]=='re' for it in d['items']) and abs(d['rect'].width-190.528)<.1 and d['rect'].y0<dr['rect'].y0 and d['rect'].y1>dr['rect'].y1]
 box=boxes[-1]; pts=[]
 for it in dr['items']:
  assert it[0]=='l'
  if not pts: pts.append(it[1])
  pts.append(it[2])
 xy=[ [round((p.x-box.x0)/box.width*800-400,6),round((box.y1-p.y)/box.height*ylim,6)] for p in pts]
 out['curves'][name]={'pdfPage':pg,'printedPage':pg-2,'stroke':idx,'xMm_yMicrometre':xy}
(root/'docs/roboter-bahnplanung/data/single-pass.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
