import { Transcriptome, Dimensions } from '../../types/api';

interface ORFPlotData {
    transcriptome: Transcriptome;
    dimensions: Dimensions;
}

export class ORFPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private transcriptome: Transcriptome;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: ORFPlotData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.transcriptome = data.transcriptome;
    }

    public plot(): void {
        const unique_orfs = new Set();
        const orfs = [];

        for (const transcript of this.transcriptome) {
            if (transcript.getCDS().length === 0) {
                continue;
            }
            const CDSs = transcript.getCDS();
            const cds_chain = CDSs.map(obj => ([obj.getStart(), obj.getEnd() ]));
            const cds_string = cds_chain.toString();
            if (!unique_orfs.has(cds_string)) {
                unique_orfs.add(cds_string);
                orfs.push({ 'orf': transcript.getCDS(), 'gene_name': transcript.getAttribute('gene_name'), 'y': 0 });
            }
        }
        orfs.sort((a, b) => a["orf"][0].getStart() - b["orf"][0].getStart());

        let rows: number[] = [];
        for (const orf of orfs) {
            let found_row = false;
            let row_i = 0;
            for (const row of rows) {
                if (orf["orf"][0].getStart() > row) {
                    found_row = true;
                    rows[row_i] = orf["orf"][orf["orf"].length-1].getEnd();
                    orf["y"] = row_i;
                    break;
                }
                row_i += 1;
            }
            if (!found_row) {
                rows.push(orf["orf"][orf["orf"].length-1].getEnd());
                orf["y"] = rows.length - 1;
            }
        }

        const orf_height = (this.dimensions["height"] / rows.length) * 0.8;
        const offset = this.dimensions["height"] / rows.length;

        for (const orf of orfs) {
            for (let c_i = 0; c_i < orf["orf"].length; c_i++) {
                const cds = orf["orf"][c_i];
                const cds_start = (cds.getStart() / this.transcriptome.getEnd()) * this.dimensions["width"];
                const cds_end = (cds.getEnd() / this.transcriptome.getEnd()) * this.dimensions["width"];
                const orf_y = this.dimensions["y"] + orf["y"] * offset;

                const orfSvg = this.svg.append('g');
                let cur_seg = orfSvg.append('rect')
                    .attr('x', cds_start)
                    .attr('y', orf_y)
                    .attr('height', orf_height)
                    .style('fill', '#F2C14E');

                if (c_i === orf["orf"].length - 1) {
                    cur_seg.attr('width', (cds_end - cds_start) - 10);
                    const trianglePoints = `${cds_end - 10},${orf_y + orf_height} ${cds_end - 10},${orf_y} ${cds_end},${orf_y + orf_height / 2}`;
                    orfSvg.append('polygon')
                        .attr('points', trianglePoints)
                        .style('fill', '#F2C14E');
                } else {
                    cur_seg.attr('width', (cds_end - cds_start));
                }

                if (c_i > 0) {
                    const prev_cds_end = (orf["orf"][c_i - 1].getEnd() / this.transcriptome.getEnd()) * this.dimensions["width"];
                    orfSvg.append('line')
                        .attr('x1', prev_cds_end)
                        .attr('y1', orf_y + orf_height / 2)
                        .attr('x2', cds_start)
                        .attr('y2', orf_y + orf_height / 2)
                        .style('stroke', '#280274')
                        .style('stroke-width', 1);
                }
            }

            const orf_midpoint = (orf["orf"][0].getStart() + orf["orf"][orf["orf"].length-1].getEnd()) / 2;
            const orf_label_x = (orf_midpoint / this.transcriptome.getEnd()) * this.dimensions["width"];
            this.svg.append('text')
                .attr('x', orf_label_x)
                .attr('y', this.dimensions["y"] + orf["y"] * offset + orf_height / 2)
                .attr('text-anchor', 'middle')
                .style('fill', 'black')
                .style('font-size', this.dimensions["fontSize"] + "px")
                .text(orf["gene_name"]);
        }
    }
}