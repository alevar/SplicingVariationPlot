import { TranscriptPlot } from './TranscriptPlot';
import { Transcriptome, Dimensions, D3Grid, GridConfig } from '../../types/api';

// builds a panel of all transcripts to be plotted

interface TranscriptomePlotData {
    transcriptome: Transcriptome;
    dimensions: Dimensions;
}

export class TranscriptomePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private transcriptome: Transcriptome;

    private transcript_height: number = 0;

    private genes: any[] = []; // gene groups mapping gene name to upper and lower y coordinates in the plot

    private gridConfig: GridConfig = {
        columns: 1,
        columnRatios: [1],
        rowRatiosPerColumn: [
            [],
        ],
    };
    private grid: D3Grid;

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: TranscriptomePlotData) {
        this.svg = svgElement;
        this.dimensions = data.dimensions;
        this.transcriptome = data.transcriptome;
        this.transcript_height = this.dimensions.height / this.transcriptome.numTranscripts();
        this.genes = [];

        // construct grid
        const transcript_ratio = 1 / this.transcriptome.numTranscripts();
        for (const _ of this.transcriptome) {
            // add row for each transcript
            this.gridConfig.rowRatiosPerColumn[0].push(transcript_ratio);
        }

        this.grid = new D3Grid(this.svg, this.dimensions.height, this.dimensions.width, this.gridConfig);
    }

    public plot(): any[] {
        let tx_idx = 0;
        for (const [gene_id, transcripts] of this.transcriptome.genes()) {
            // pull coordinates of first transcript in the group
            const svg_coordinates = this.grid.getCellCoordinates(0, tx_idx);
            const y_pos = svg_coordinates?.y || 0;
            this.genes.push({ "name": gene_id, "y": [y_pos, y_pos + transcripts.length * this.transcript_height] });
            for (const transcript of transcripts) {
                const txPlotSvg = this.grid.getCellSvg(0, tx_idx);

                if (txPlotSvg) {
                    const svg_dimensions = this.grid.getCellDimensions(0, tx_idx);
                    const svg_coordinates = this.grid.getCellCoordinates(0, tx_idx);

                    const txPlotDimensions = {
                        width: svg_dimensions?.width || 0,
                        height: svg_dimensions?.height || 0,
                        x: svg_coordinates?.x || 0,
                        y: svg_coordinates?.y || 0,
                        fontSize: this.dimensions.fontSize,
                    };

                    const txPlot = new TranscriptPlot(txPlotSvg, {
                        dimensions: txPlotDimensions,
                        genome_length: this.transcriptome.getEnd(),
                        transcript: transcript
                    });
                    txPlot.plot();
                }
                tx_idx += 1;
            }
        }
        console.log(this.genes);
        return this.genes;
    }
}


interface TranscriptomePlotLabelsData {
    dimensions: Dimensions;
    genes: any[];
}

export class TranscriptomePlotLabels {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private genes: any[];

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
        data: TranscriptomePlotLabelsData,
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.genes = data.genes;
    }

    private createCurlyBracePath(y0: number, y1: number): string {
        const braceWidth = this.dimensions["width"] / 4;
        const height = y1 - y0;
    
        // Scale the sample path to fit the desired height
        const scaledPath = `
            M 0,${y0}
            C ${braceWidth/2},${y0} 0,${y0 + height / 2} ${braceWidth},${y0 + height / 2}
            C 0,${y0 + height / 2} ${braceWidth/2},${y1} 0,${y1}
            
        `;
        
        return scaledPath;
    }

    public plot(): void {
        this.genes.forEach(gene => {
            const gene_y = gene["y"][0] + (gene["y"][1] - gene["y"][0]) / 2;
            this.svg.append('text')
                .attr('x', this.dimensions["width"] / 2)
                .attr('y', gene_y)
                .attr('text-anchor', 'middle')
                .style('fill', 'black')
                .style('font-size', this.dimensions["fontSize"] + "px")
                .text(gene["name"]);
            // draw brace
            this.svg.append('path')
                .attr('d', this.createCurlyBracePath(gene["y"][0], gene["y"][1]))
                .attr('stroke', 'black')
                .attr('fill', 'none');
        });
    }
}