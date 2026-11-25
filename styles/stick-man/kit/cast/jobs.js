// The wardrobe's job presets (kit/cast/wardrobe.js), on their own so that a table or a gate reads them without the engine.
export const JOBS = {
  doctor: ['shirt:office:sky', 'tie:teal', 'coat:doctor', 'stethoscope', 'nametag', 'pens'],
  nurse: ['scrubs:teal', 'badge:id', 'pens', 'cap:scrub'],
  police: ['shirt:police', 'tie:navy', 'badge:police', 'epaulettes', 'dutybelt', 'cap:police'],
  pilot: ['shirt:office:sky', 'tie:navy', 'jacket:pilot', 'badge:wings', 'epaulettes', 'cap:pilot'],
  worker: ['shirt:work', 'vest:hivis', 'hat:hard'],
  office: ['shirt:office', 'tie:crimson', 'nametag', 'pens'],
  manager: ['shirt:office:sky', 'tie:mustard', 'blazer:slate'],
  chef: ['jacket:chef', 'apron:slate:low', 'hat:toque'],
  student: ['shirt:office:sky', 'tie:forest', 'cardigan:mustard', 'backpack:teal'],
  'student-blazer': ['shirt:office:sky', 'tie:stripe', 'blazer:navy', 'badge:crest', 'backpack'],
  florist: ['shirt:office:rose', 'apron:forest'],
};
export const expand = list => list.flatMap(it => { const [k, a] = String(it).split(':'); if (k !== 'job') return [it]; if (!JOBS[a]) throw new Error(`costume job:${a}: no such job (${Object.keys(JOBS).join(', ')})`); return JOBS[a]; });
