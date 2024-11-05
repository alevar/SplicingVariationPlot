import { ORFPlot } from ".";
import { Transcriptome, Dimensions, D3Grid, GridConfig } from "../../types/api";

interface PathogenPlotData {
    transcriptome: Transcriptome;
    dimensions: Dimensions;
}

export class PathogenPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private transcriptome: Transcriptome;

    private gridConfig: GridConfig = {
        columns: 1,
        columnRatios: [1],
        rowRatiosPerColumn: [
            [0.0, 1], // genomePlot, ORFPlot
        ]
    };
    private grid: D3Grid;

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: PathogenPlotData) {
        this.svg = svgElement;
        this.dimensions = data.dimensions;
        this.transcriptome = data.transcriptome;

        this.grid = new D3Grid(this.svg, this.dimensions.height, this.dimensions.width, this.gridConfig);
    }

    public plot(): void {

        const orfPlotSvg = this.grid.getCellSvg(0, 1);
        if (orfPlotSvg) {
            const svg_dimensions = this.grid.getCellDimensions(0, 1);
            const svg_coordinates = this.grid.getCellCoordinates(0, 1);

            const orfPlotDimensions = {
                width: svg_dimensions?.width || 0,
                height: svg_dimensions?.height || 0,
                x: svg_coordinates?.x || 0,
                y: svg_coordinates?.y || 0,
                fontSize: this.dimensions.fontSize,
            };

            const orfPlot = new ORFPlot(this.svg, {
                dimensions: orfPlotDimensions, 
                transcriptome: this.transcriptome
            });
            orfPlot.plot();
        }
    }
}