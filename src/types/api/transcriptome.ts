type FeatureType = 'transcript' | 'exon' | 'CDS' | 'other';

class GTFObject {
    seqid: string;
    strand: string;
    type: FeatureType;
    start: number;
    end: number;
    attributes: Record<string, string>;
    transcript_id?: string;

    constructor(seqid: string, strand: string, start: number, end: number, type: FeatureType, attributes: Record<string, string>, transcript_id?: string) {
        if (start < 0 || end < 0 || start > end) {
            throw new Error('Invalid interval');
        }
        this.seqid = seqid;
        this.strand = strand;
        this.start = start;
        this.end = end;
        this.type = type;
        this.attributes = attributes;
        this.transcript_id = transcript_id;
    }

    getAttribute(key: string): string {
        return this.attributes[key];
    }
    getStart(): number {
        return this.start;
    }
    getEnd(): number {
        return this.end;
    }
}

class Exon extends GTFObject { }
class CDS extends GTFObject { }
class Object extends GTFObject {
    originalType: string;

    constructor(seqid: string, strand: string, start: number, end: number, type: FeatureType, attributes: Record<string, string>, originalType: string) {
        super(seqid, strand, start, end, type, attributes);
        this.originalType = originalType;
    }
}

class Transcript extends GTFObject {
    exons: Exon[] = [];
    cdsFeatures: CDS[] = [];
    gene_id: string;

    constructor(
        seqid: string,
        strand: string,
        start: number,
        end: number,
        attributes: Record<string, string>,
        transcript_id: string,
        gene_id: string
    ) {
        super(seqid, strand, start, end, 'transcript', attributes, transcript_id);
        this.gene_id = gene_id;
    }

    addExon(exon: Exon) {
        if (exon.seqid !== this.seqid || exon.strand !== this.strand) {
            throw new Error(`Inconsistent seqid or strand in exon ${exon.transcript_id}`);
        }
        if (exon.start < this.start || exon.end > this.end) {
            throw new Error(`Exon ${exon.transcript_id} out of transcript bounds`);
        }
        this.exons.push(exon);
        this.exons.sort((a, b) => a.start - b.start);
    }

    addCDS(cds: CDS) {
        if (cds.seqid !== this.seqid || cds.strand !== this.strand) {
            throw new Error(`Inconsistent seqid or strand in CDS ${cds.transcript_id}`);
        }
        if (cds.start < this.start || cds.end > this.end) {
            throw new Error(`CDS ${cds.transcript_id} out of transcript bounds`);
        }
        this.cdsFeatures.push(cds);
        this.cdsFeatures.sort((a, b) => a.start - b.start);
    }

    getCDS(): CDS[] {
        return this.cdsFeatures;
    }
    getExons(): Exon[] {
        return this.exons;
    }
    getTranscriptId(): string {
        return this.transcript_id||"";
    }
}

class Transcriptome {
    seqid?: string;
    strand?: string;
    start?: number;
    end?: number;

    transcripts: Transcript[] = [];
    otherFeatures: GTFObject[] = [];
    transcriptsByGene: Map<string, number[]> = new Map();
    transcriptsById: Map<string, number> = new Map();

    genome_length: number = 0;

    constructor(gtfFile?: File) {
        if (gtfFile) {
            this.parseGTFFile(gtfFile);
        }
    }

    static async create(file: File): Promise<Transcriptome> {
        const instance = new Transcriptome();
        await instance.parseGTFFile(file);
        return instance;
    }

    private parseGTFFile(gtfFile: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = e.target?.result as string;
                    const lines = result.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('#') || !line.trim()) continue;
                        const [seqid, , type, startStr, endStr, , strand, , attrStr] = line.split('\t');

                        const start = parseInt(startStr);
                        const end = parseInt(endStr);
                        const attributes = this.parseAttributes(attrStr);

                        // make sure seqid and strand is the same for all transcriptome otherwise set to current seqid if was undefined
                        if (this.seqid && this.seqid !== seqid) {
                            throw new Error('Inconsistent seqid');
                        }
                        if (this.strand && this.strand !== strand) {
                            throw new Error('Inconsistent strand');
                        }
                        this.seqid = seqid;
                        this.strand = strand;
                        // set start and end to the min and max of all transcriptome
                        if (this.start === undefined || this.start > parseInt(startStr)) {
                            this.start = parseInt(startStr);
                        }
                        if (this.end === undefined || this.end < parseInt(endStr)) {
                            this.end = parseInt(endStr);
                        }

                        switch (type) {
                            case 'transcript':
                            case 'exon':
                            case 'CDS':
                                break;
                            default:
                                const otherObject = new Object(seqid, strand, start, end, 'other' as FeatureType, attributes, type);
                                this.otherFeatures.push(otherObject);
                                continue;
                        }

                        const transcript_id = attributes['transcript_id'];
                        let tx_idx: number | undefined;

                        switch (type) {
                            case 'transcript':
                                const gene_id = attributes['gene_id'];
                                const transcript = new Transcript(seqid, strand, start, end, attributes, transcript_id, gene_id);
                                this.transcripts.push(transcript);
                                tx_idx = this.transcripts.length - 1;
                                this.transcriptsById.set(transcript_id, tx_idx);
                                if (!this.transcriptsByGene.has(gene_id)) {
                                    this.transcriptsByGene.set(gene_id, []);
                                }
                                this.transcriptsByGene.get(gene_id)?.push(tx_idx);

                                break;
                            case 'exon':
                                tx_idx = this.transcriptsById.get(transcript_id);
                                if (tx_idx === undefined) {
                                    throw new Error(`Exon references unknown transcript_id ${transcript_id}`);
                                }
                                const exon = new Exon(seqid, strand, start, end, 'exon', attributes, transcript_id);
                                this.transcripts[tx_idx].addExon(exon);
                                break;
                            case 'CDS':
                                tx_idx = this.transcriptsById.get(transcript_id);
                                if (tx_idx === undefined) {
                                    throw new Error(`CDS references unknown transcript_id ${transcript_id}`);
                                }
                                const cds = new CDS(seqid, strand, start, end, 'CDS', attributes, transcript_id);
                                this.transcripts[tx_idx].addCDS(cds);
                                break;
                            default:
                                break;
                        }
                    }
                    resolve();
                } catch (error) {
                    console.error(`Failed to parse GTF file: ${error instanceof Error ? error.message : error}`);
                    reject(error);
                }
            };
            reader.onerror = () => {
                console.error('Failed to read the file');
                reject(new Error('Failed to read the file'));
            };
            reader.readAsText(gtfFile);
        });
    }

    private parseAttributes(attrStr: string): Record<string, string> {
        const attributes: Record<string, string> = {};
        attrStr.split(';').forEach(attr => {
            const [key, value] = attr.trim().split(' ');
            if (key && value) {
                attributes[key] = value.replace(/"/g, '');
            }
        });
        return attributes;
    }

    getTranscriptsByGene(gene_id: string): Transcript[] | undefined {
        const indices = this.transcriptsByGene.get(gene_id);
        if (!indices) {
            return undefined;
        }
        return indices.map(idx => this.transcripts[idx]);
    }

    getTranscriptById(transcript_id: string): Transcript | undefined {
        const idx = this.transcriptsById.get(transcript_id);
        if (idx === undefined) {
            return undefined;
        }
        return this.transcripts[idx];
    }

    getStart(): number {
        return this.start || 0;
    }
    getEnd(): number {
        return this.end || 0;
    }
    // iterator over transcripts
    [Symbol.iterator]() {
        let index = 0;
        const transcripts = this.transcripts;
        return {
            next(): { value: Transcript, done: boolean; } {
                if (index < transcripts.length) {
                    return { value: transcripts[index++], done: false };
                } else {
                    return { value: transcripts[index++], done: true };
                }
            }
        };
    }

    // iterator by gene. yields gene_id and a list of associated transcripts
    *genes(): Generator<[string, Transcript[]], void, unknown> {
        for (const [gene_id, tx_indices] of this.transcriptsByGene) {
            const transcripts: Transcript[] = tx_indices.map(idx => this.transcripts[idx]);
            yield [gene_id, transcripts];
        }
    }

    numTranscripts(): number {
        return this.transcripts.length;
    }

    // iterator over splice junctions
    *junctions(): Generator<[number, number], void, unknown> {
        const seen_junctions = new Set<number[]>();
        for (const transcript of this.transcripts) {
            const exons = transcript.getExons();
            for (let i = 0; i < exons.length - 1; i++) {
                const junction = [exons[i].end,exons[i + 1].start];
                if (!seen_junctions.has(junction)) {
                    seen_junctions.add(junction);
                    yield [junction[0], junction[1]];
                }
            }
        }
    }
    *donors(): Generator<number, void, unknown> {
        const seen_donors = new Set<number>();
        for (const [donor, ] of this.junctions()) {
            if (!seen_donors.has(donor)) {
                seen_donors.add(donor);
                yield donor;
            }
        }
    }
    *acceptors(): Generator<number, void, unknown> {
        const seen_acceptors = new Set<number>();
        for (const [, acceptor] of this.junctions()) {
            if (!seen_acceptors.has(acceptor)) {
                seen_acceptors.add(acceptor);
                yield acceptor;
            }
        }
    }
}

export { Transcriptome, Transcript, Exon, CDS };