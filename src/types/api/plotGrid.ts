export interface GridConfig {
    columns: number;
    columnRatios: number[];
    rowRatiosPerColumn: number[][];
}

export interface Padding {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export class D3Grid {
    private height: number;
    private width: number;
    private gridConfig: GridConfig;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private cellDimensions_raw: { width: number, height: number }[][];
    private cellDimensions: { width: number, height: number }[][];
    private cellCoordinates: { x: number, y: number }[][];
    private cellData: any[][]; // holds any data associated with each cell
    private cellSvgs: d3.Selection<SVGSVGElement, unknown, null, undefined>[][];

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
        height: number, 
        width: number, 
        gridConfig: GridConfig
    ) {
        this.height = height;
        this.width = width;
        this.gridConfig = gridConfig;

        this.cellDimensions_raw = [];
        this.cellDimensions = [];
        this.cellCoordinates = [];
        this.cellData = [];
        this.cellSvgs = [];
        this.svg = svg
            .attr('width', this.width)
            .attr('height', this.height);

        // Setup grid
        this.setupGrid();
    }

    private setupGrid(): void {
        const totalColumnRatio = this.gridConfig.columnRatios.reduce((sum, ratio) => sum + ratio, 0);

        let xOffset = 0;
        this.gridConfig.columnRatios.forEach((colRatio, colIndex) => {
            const columnWidth = (colRatio / totalColumnRatio) * this.width;
            const totalRowRatio = this.gridConfig.rowRatiosPerColumn[colIndex].reduce((sum, ratio) => sum + ratio, 0);
            this.cellDimensions_raw[colIndex] = [];
            this.cellDimensions[colIndex] = [];
            this.cellCoordinates[colIndex] = [];
            this.cellData[colIndex] = [];
            this.cellSvgs[colIndex] = [];

            let yOffset = 0;
            this.gridConfig.rowRatiosPerColumn[colIndex].forEach((rowRatio, rowIndex) => {
                const rowHeight = (rowRatio / totalRowRatio) * this.height;

                const paddedWidth = columnWidth;
                const paddedHeight = rowHeight;

                this.cellDimensions_raw[colIndex][rowIndex] = { width: columnWidth, height: rowHeight };
                this.cellDimensions[colIndex][rowIndex] = { width: paddedWidth, height: paddedHeight };
                this.cellCoordinates[colIndex][rowIndex] = { x: xOffset, y: yOffset };
                this.cellData[colIndex][rowIndex] = {};

                const new_svg = this.svg.append('svg')
                    .attr('x', xOffset)
                    .attr('y', yOffset)
                    .attr('width', columnWidth)
                    .attr('height', rowHeight);
                this.cellSvgs[colIndex][rowIndex] = new_svg;

                yOffset += rowHeight;
            });

            xOffset += columnWidth;
        });
    }

    public getCellData(colIndex: number, rowIndex: number): any {
        return this.cellData[colIndex]?.[rowIndex];
    }

    public setCellData(colIndex: number, rowIndex: number, data: any): void {
        this.cellData[colIndex][rowIndex] = data;
    }

    public getSvg(): d3.Selection<SVGSVGElement, unknown, null, undefined> {
        return this.svg;
    }

    public getCellDimensions(colIndex: number, rowIndex: number): { width: number, height: number } | undefined {
        return this.cellDimensions[colIndex]?.[rowIndex];
    }

    public getCellCoordinates_unpadded(colIndex: number, rowIndex: number): { x: number, y: number } | undefined {
        return this.cellCoordinates[colIndex]?.[rowIndex];
    }

    public getCellCoordinates(colIndex: number, rowIndex: number): { x: number, y: number } | undefined {
        const coordinates = this.cellCoordinates[colIndex]?.[rowIndex];
        if (coordinates) {
            return {
                x: coordinates.x,
                y: coordinates.y
            };
        }
        return undefined;
    }

    public getCellSvg(colIndex: number, rowIndex: number): d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined {
        return this.cellSvgs[colIndex]?.[rowIndex];
    }

    public createOverlaySvg(colIndex: number, rowIndices: number[]): d3.Selection<SVGSVGElement, unknown, null, undefined> {
        // Determine the combined height and position based on the rows to be combined
        const combinedHeight = rowIndices.reduce((sum, rowIndex) => sum + this.cellDimensions_raw[colIndex][rowIndex].height, 0);
        const firstRowIndex = rowIndices[0];
        const firstCellCoords = this.getCellCoordinates_unpadded(colIndex, firstRowIndex);
    
        const combinedWidth = this.cellDimensions[colIndex][firstRowIndex].width;
    
        // Create a new SVG for the overlay
        const overlaySvg = this.svg.append('svg')
            .attr('x', firstCellCoords?.x || 0) // Use 0 as default if x is undefined
            .attr('y', firstCellCoords?.y || 0) // Use 0 as default if y is undefined
            .attr('width', combinedWidth)
            .attr('height', combinedHeight)
            .style('pointer-events', 'none'); // Make sure the overlay doesn't block interactions with underlying SVGs
    
        return overlaySvg;
    }

    public promote(colIndex: number, rowIndex: number): void {
        const cellSvg = this.getCellSvg(colIndex, rowIndex);
        if (cellSvg) {
            cellSvg.raise();
        }
    }
}