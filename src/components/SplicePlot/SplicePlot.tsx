import * as d3 from 'd3';

import {
    Transcriptome,
    BedFile,
    BedData,
    D3Grid,
    GridConfig,
    ORFPlot,
    TranscriptomePlot,
    TranscriptomePlotLabels,
    BarPlot,
    LinePlot,
    DataPlotArray,
    TriangleConnector
} from 'sparrowgenomelib';

interface SplicePlotData {
    transcriptome: Transcriptome;
    bedFiles: { donors: BedFile, acceptors: BedFile };
    zoomWidth: number;
    zoomWindowWidth: number;
    width: number;
    height: number;
    fontSize: number;
}

export class SplicePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private width: number;
    private height: number;
    private fontSize: number;
    private zoomWindowWidth: number;
    private zoomWidth: number;
    private transcriptome: Transcriptome = new Transcriptome();
    private bedFiles: { donors: BedFile; acceptors: BedFile } = {
        donors: {
            data: new BedData(),
            fileName: "",
            status: 0,
        },
        acceptors: {
            data: new BedData(),
            fileName: "",
            status: 0,
        }
    };

    private gridConfig: GridConfig = {
        columns: 3,
        columnRatios: [0.8, 0.1, 0.1], // plot, labels, legend
        rowRatiosPerColumn: [
            [0.1, 0.45, 0.025, 0.05, 0.025, 0.15, 0.025, 0.05, 0.025, 0.15], // pathogen, transcriptome, spacer, donor fullgenome barplot, spacer, donor expression, spacer, acceptor expression, spacer, acceptor expression
            [0.1, 0.45, 0.025, 0.05, 0.025, 0.15, 0.025, 0.05, 0.025, 0.15], // pathogen, transcriptome, spacer, donor fullgenome barplot, spacer, donor expression, spacer, acceptor expression, spacer, acceptor expression
            [1], // 1 row: legend
        ],
    };
    private grid: D3Grid;

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: SplicePlotData) {

        this.width = data.width;
        this.height = data.height;
        this.fontSize = data.fontSize;

        this.zoomWindowWidth = data.zoomWindowWidth;
        this.zoomWidth = data.zoomWidth;

        this.transcriptome = data.transcriptome;
        this.bedFiles = data.bedFiles;

        this.svg = svgElement;

        this.grid = new D3Grid(this.svg, this.height, this.width, this.gridConfig);
    }

    public plot(): void {
        const pathogenPlotSvg = this.grid.getCellSvg(0, 0);
        if (pathogenPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 0);
            const coordinates = this.grid.getCellCoordinates(0, 0);

            const ORFPlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            const orfPlot = new ORFPlot(pathogenPlotSvg, {
                dimensions: ORFPlotDimensions,
                transcriptome: this.transcriptome
            });
            this.grid.setCellData(0, 0, orfPlot);
            orfPlot.plot();
        }

        const transcriptomePlotSvg = this.grid.getCellSvg(0, 1);
        let gene_coords: any[] = [];
        if (transcriptomePlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 1);
            const coordinates = this.grid.getCellCoordinates(0, 1);

            const transcriptomePlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            const transcriptomePlot = new TranscriptomePlot(transcriptomePlotSvg, {
                dimensions: transcriptomePlotDimensions,
                transcriptome: this.transcriptome
            });
            this.grid.setCellData(0, 1, transcriptomePlot);
            gene_coords = transcriptomePlot.plot();
        }

        const geneLabelPlotSvg = this.grid.getCellSvg(1, 1);
        if (geneLabelPlotSvg) {
            const dimensions = this.grid.getCellDimensions(1, 1);
            const coordinates = this.grid.getCellCoordinates(1, 1);

            const geneLabelPlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            const geneLabelPlot = new TranscriptomePlotLabels(geneLabelPlotSvg, {
                dimensions: geneLabelPlotDimensions,
                genes: gene_coords
            });
            this.grid.setCellData(1, 1, geneLabelPlot);
            geneLabelPlot.plot();
        }

        // draw donors on overlay
        const donor_dashedLine_overlaySvg = this.grid.createOverlaySvg(0, [0, 1, 2]);
        if (donor_dashedLine_overlaySvg) {
            const dimensions = this.grid.getCellDimensions(0, 1);

            for (const donor of this.transcriptome.donors()) {
                const donor_x = donor / this.transcriptome.getEnd() * (dimensions?.width || 0);
                donor_dashedLine_overlaySvg.append("line")
                    .attr("x1", donor_x)
                    .attr("y1", 0)
                    .attr("x2", donor_x)
                    .attr("y2", this.height)
                    .attr("stroke", "#F78154")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "5,5");
            }
        }

        // draw acceptors on overlay
        const acceptor_dashedLine_overlaySvg = this.grid.createOverlaySvg(0, [0, 1, 2, 3, 4, 5, 6]);
        if (acceptor_dashedLine_overlaySvg) {
            const dimensions = this.grid.getCellDimensions(0, 1);

            for (const acceptor of this.transcriptome.acceptors()) {
                const acceptor_x = acceptor / this.transcriptome.getEnd() * (dimensions?.width || 0);
                acceptor_dashedLine_overlaySvg.append("line")
                    .attr("x1", acceptor_x)
                    .attr("y1", 0)
                    .attr("x2", acceptor_x)
                    .attr("y2", this.height)
                    .attr("stroke", "#5FAD56")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "5,5");
            }
        }

        // ==================== DONOR PLOTS ====================
        // plot donor full genome barplot
        const donor_fullGenomePlotSvg = this.grid.getCellSvg(0, 3);
        if (donor_fullGenomePlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 3);
            const coordinates = this.grid.getCellCoordinates(0, 3);

            const donor_fullGenomePlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            // Create the x-axis scale
            const xScale = d3.scaleLinear()
                .domain([0, this.transcriptome.getEnd()])
                .range([0, donor_fullGenomePlotDimensions.width]);

            const donor_fullGenomePlot = new BarPlot(donor_fullGenomePlotSvg, {
                dimensions: donor_fullGenomePlotDimensions,
                bedData: this.bedFiles.donors.data,
                xScale: xScale,
                color: "#F78154"
            });
            this.grid.setCellData(0, 3, donor_fullGenomePlot);
            donor_fullGenomePlot.plot();
        }

        const donor_dataPlotArraySvg = this.grid.getCellSvg(0, 5);
        if (donor_dataPlotArraySvg) {
            const dimensions = this.grid.getCellDimensions(0, 5);
            const coordinates = this.grid.getCellCoordinates(0, 5);

            const donor_dataPlotArrayDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            let donor_positions: number[] = []; // gather list of donor positions
            let donor_maxExpression = 0; // find max expression value
            for (const donor of this.transcriptome.donors()) {
                donor_positions.push(donor);
                const donor_range = this.bedFiles.donors.data.getRange(donor-this.zoomWidth,donor+this.zoomWidth);
                if ( donor_range.maxScore() > donor_maxExpression) {
                    donor_maxExpression = donor_range.maxScore();
                }
            }
            // sort donor positions
            donor_positions.sort((a, b) => a - b);
            const donor_dataPlotArray = new DataPlotArray({
                svg: donor_dataPlotArraySvg,
                dimensions: donor_dataPlotArrayDimensions,
                coordinateLength: this.transcriptome.getEnd(),
                elements: donor_positions,
                elementWidth: this.zoomWindowWidth,
                maxValue: donor_maxExpression,
            });
            this.grid.setCellData(0, 5, donor_dataPlotArray);
            donor_dataPlotArray.plot();
            const donor_dataPlotArray_yScale = donor_dataPlotArray.getYScale();

            // create individual plots for each donor site
            for (let i = 0; i < donor_positions.length; i++) {
                const donor = donor_positions[i];
                // pull corresponding svg from the grid
                const donor_zoomPlotSvg = donor_dataPlotArray.getElementSVG(i);
                if (donor_zoomPlotSvg) {
                    const donor_zoomCellDimensions = donor_dataPlotArray.getCellDimensions(i);
                    const donor_zoomCellCoordinates = donor_dataPlotArray.getCellCoordinates(i);

                    const donor_zoomPlotDimensions = {
                        width: donor_zoomCellDimensions?.width || 0,
                        height: donor_zoomCellDimensions?.height || 0,
                        x: donor_zoomCellCoordinates?.x || 0,
                        y: donor_zoomCellCoordinates?.y || 0,
                        fontSize: this.fontSize,
                    };

                    // add background color to the zoomed in plot
                    donor_zoomPlotSvg.append("rect")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", donor_zoomPlotDimensions.width)
                        .attr("height", donor_zoomPlotDimensions.height)
                        .attr("fill", "#F78154")
                        .attr("fill-opacity", 0.75);

                    // extract data from bed for the current donor
                    const subBedData = this.bedFiles.donors.data.getRange(donor - this.zoomWidth, donor + this.zoomWidth);
                    const explodedSubBedData = subBedData.explode();
                    const xScale = d3.scaleLinear()
                        .domain([donor-this.zoomWidth, donor+this.zoomWidth])
                        .range([0, donor_zoomPlotDimensions.width]);
                    const donor_zoomPlot = new LinePlot(donor_zoomPlotSvg, {
                        dimensions: donor_zoomPlotDimensions,
                        bedData: explodedSubBedData,
                        xScale: xScale,
                        yScale: donor_dataPlotArray_yScale,
                        color: "red"
                    });
                    donor_zoomPlot.plot();

                    // build connector in the overlay between zoom and original points
                    const donor_spacerSvg = this.grid.getCellSvg(0, 4);
                    if ( donor_spacerSvg ) {
                        const donor_spacerDimensions = this.grid.getCellDimensions(0, 4);
                        const donor_spacerCoordinates = this.grid.getCellCoordinates(0, 4);
                        const donor_spacerPlotDimensions = {
                            width: donor_spacerDimensions?.width || 0,
                            height: donor_spacerDimensions?.height || 0,
                            x: donor_spacerCoordinates?.x || 0,
                            y: donor_spacerCoordinates?.y || 0,
                            fontSize: this.fontSize,
                        };

                        const zoom_intervals: [[number,number],[number,number]] = donor_dataPlotArray.getElementMapping(i);
                        const donor_spacerPlot = new TriangleConnector({
                            svg: donor_spacerSvg,
                            dimensions: donor_spacerPlotDimensions,
                            points: {
                                top: (zoom_intervals[0][0] + zoom_intervals[0][1]) / 2,
                                left: zoom_intervals[1][0],
                                right: zoom_intervals[1][1],
                                mid: (zoom_intervals[1][0] + zoom_intervals[1][1]) / 2
                            },
                            color: "red"
                        });
                        donor_spacerPlot.plot();
                    }
                }
            }
        }

        // ================ ACCEPTOR ARRAY PLOTS ================
        // plot acceptor full genome barplot
        const acceptor_fullGenomePlotSvg = this.grid.getCellSvg(0, 7);
        if (acceptor_fullGenomePlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 7);
            const coordinates = this.grid.getCellCoordinates(0, 7);

            const acceptor_fullGenomePlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            // Create the x-axis scale
            const xScale = d3.scaleLinear()
                .domain([0, this.transcriptome.getEnd()])
                .range([0, acceptor_fullGenomePlotDimensions.width]);

            const acceptor_fullGenomePlot = new BarPlot(acceptor_fullGenomePlotSvg, {
                dimensions: acceptor_fullGenomePlotDimensions,
                bedData: this.bedFiles.acceptors.data,
                xScale: xScale,
                color: "#5FAD56"
            });
            this.grid.setCellData(0, 7, acceptor_fullGenomePlot);
            acceptor_fullGenomePlot.plot();
        }

        const acceptor_dataPlotArraySvg = this.grid.getCellSvg(0, 9);
        if (acceptor_dataPlotArraySvg) {
            const dimensions = this.grid.getCellDimensions(0, 9);
            const coordinates = this.grid.getCellCoordinates(0, 9);

            const acceptor_dataPlotArrayDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: coordinates?.x || 0,
                y: coordinates?.y || 0,
                fontSize: this.fontSize,
            };

            let acceptor_positions: number[] = []; // gather list of acceptors positions
            let acceptor_maxExpression = 0; // find max expression value
            for (const acceptor of this.transcriptome.acceptors()) {
                acceptor_positions.push(acceptor);
                const acceptor_range = this.bedFiles.acceptors.data.getRange(acceptor-this.zoomWidth,acceptor+this.zoomWidth);
                if ( acceptor_range.maxScore() > acceptor_maxExpression) {
                    acceptor_maxExpression = acceptor_range.maxScore();
                }
            }
            // sort acceptor positions
            acceptor_positions.sort((a, b) => a - b);
            const acceptor_dataPlotArray = new DataPlotArray({
                svg: acceptor_dataPlotArraySvg,
                dimensions: acceptor_dataPlotArrayDimensions,
                coordinateLength: this.transcriptome.getEnd(),
                elements: acceptor_positions,
                elementWidth: this.zoomWindowWidth,
                maxValue: acceptor_maxExpression,
            });
            this.grid.setCellData(0, 9, acceptor_dataPlotArray);
            acceptor_dataPlotArray.plot();
            const acceptor_dataPlotArray_yScale = acceptor_dataPlotArray.getYScale();

            // create individual plots for each acceptor site
            for (let i = 0; i < acceptor_positions.length; i++) {
                const acceptor = acceptor_positions[i];
                // pull corresponding svg from the grid
                const acceptor_zoomPlotSvg = acceptor_dataPlotArray.getElementSVG(i);
                if (acceptor_zoomPlotSvg) {
                    const acceptor_zoomCellDimensions = acceptor_dataPlotArray.getCellDimensions(i);
                    const acceptor_zoomCellCoordinates = acceptor_dataPlotArray.getCellCoordinates(i);

                    const acceptor_zoomPlotDimensions = {
                        width: acceptor_zoomCellDimensions?.width || 0,
                        height: acceptor_zoomCellDimensions?.height || 0,
                        x: acceptor_zoomCellCoordinates?.x || 0,
                        y: acceptor_zoomCellCoordinates?.y || 0,
                        fontSize: this.fontSize,
                    };

                    // add background color to the zoomed in plot
                    acceptor_zoomPlotSvg.append("rect")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", acceptor_zoomPlotDimensions.width)
                        .attr("height", acceptor_zoomPlotDimensions.height)
                        .attr("fill", "#5FAD56")
                        .attr("fill-opacity", 0.75);

                    // extract data from bed for the current acceptors
                    const subBedData = this.bedFiles.acceptors.data.getRange(acceptor - this.zoomWidth, acceptor + this.zoomWidth);
                    const explodedSubBedData = subBedData.explode();
                    const xScale = d3.scaleLinear()
                        .domain([acceptor-this.zoomWidth, acceptor+this.zoomWidth])
                        .range([0, acceptor_zoomPlotDimensions.width]);
                    const acceptor_zoomPlot = new LinePlot(acceptor_zoomPlotSvg, {
                        dimensions: acceptor_zoomPlotDimensions,
                        bedData: explodedSubBedData,
                        xScale: xScale,
                        yScale: acceptor_dataPlotArray_yScale,
                        color: "green"
                    });
                    acceptor_zoomPlot.plot();

                    // build connector in the overlay between zoom and original points
                    const acceptor_spacerSvg = this.grid.getCellSvg(0, 8);
                    if ( acceptor_spacerSvg ) {
                        const acceptor_spacerDimensions = this.grid.getCellDimensions(0, 8);
                        const acceptor_spacerCoordinates = this.grid.getCellCoordinates(0, 8);
                        const acceptor_spacerPlotDimensions = {
                            width: acceptor_spacerDimensions?.width || 0,
                            height: acceptor_spacerDimensions?.height || 0,
                            x: acceptor_spacerCoordinates?.x || 0,
                            y: acceptor_spacerCoordinates?.y || 0,
                            fontSize: this.fontSize,
                        };

                        const zoom_intervals: [[number,number],[number,number]] = acceptor_dataPlotArray.getElementMapping(i);
                        const acceptor_spacerPlot = new TriangleConnector({
                            svg: acceptor_spacerSvg,
                            dimensions: acceptor_spacerPlotDimensions,
                            points: {
                                top: (zoom_intervals[0][0] + zoom_intervals[0][1]) / 2,
                                left: zoom_intervals[1][0],
                                right: zoom_intervals[1][1],
                                mid: (zoom_intervals[1][0] + zoom_intervals[1][1]) / 2
                            },
                            color: "green"
                        });
                        acceptor_spacerPlot.plot();
                    }
                }
            }
        }

        this.grid.promote(0, 0);
        this.grid.promote(0, 3);
        this.grid.promote(0, 5);
    }
}
