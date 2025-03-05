import * as d3 from 'd3';

import {
    Transcriptome,
    BedFile,
    BedData,
    BedLine,
    D3Grid,
    GridConfig,
    ORFPlot,
    TranscriptomePlot,
    TranscriptomePlotLabels,
    BarPlot,
    BoxPlot,
    DataPlotArray,
    TriangleConnector
} from 'sparrowgenomelib';

function computeMeanScores(bedData: BedData): BedData {
    // Step 1: Explode the data into individual base-pair intervals
    const explodedData = bedData.explode().getData();

    // Step 2: Create a map to group scores by position
    const scoreMap: Map<number, { totalScore: number; count: number }> = new Map();

    explodedData.forEach(line => {
        const pos = line.start;
        if (!scoreMap.has(pos)) {
            scoreMap.set(pos, { totalScore: 0, count: 0 });
        }
        const entry = scoreMap.get(pos)!;
        entry.totalScore += line.score;
        entry.count += 1;
    });

    // Step 3: Create a new BedData object with mean scores
    const meanData = new BedData();

    for (const [pos, { totalScore, count }] of scoreMap.entries()) {
        meanData.addLine({
            seqid: "mean", // Use a placeholder name for seqid
            start: pos,
            end: pos + 1, // Single base-pair interval
            name: `mean@${pos}`, // Placeholder name
            score: totalScore / count,
            strand: ".", // Placeholder strand
        });
    }

    return meanData;
}

function computeMaxNonOutlierScore(bedData: BedData): number {
    const exploded = bedData.explode(); // Each base as its own BedLine
    const groupedScores: { [key: number]: number[] } = {};

    // Group scores by position
    exploded.getData().forEach((line) => {
        const pos = line.start;
        if (!groupedScores[pos]) {
            groupedScores[pos] = [];
        }
        groupedScores[pos].push(line.score);
    });

    // Compute max non-outlier score for each position
    const maxNonOutlierScores: number[] = Object.values(groupedScores).map((scores) => {
        scores.sort((a, b) => a - b);
        const q1 = d3.quantile(scores, 0.25) || 0;
        const q3 = d3.quantile(scores, 0.75) || 0;
        const iqr = q3 - q1;
        const upperBound = q3 + 1.5 * iqr;

        // Filter out outliers and take the max
        return Math.max(...scores.filter((score) => score <= upperBound));
    });

    // Return the overall maximum non-outlier score
    return Math.max(...maxNonOutlierScores);
}

function fill_empty_bed_positions(
    bedData: BedData,
    startPos: number,
    endPos: number,
    placeholderOptions: Partial<BedLine> = {}
): BedData {
    // Create a new BedData instance for the complete range
    const completeBedData = new BedData();
    
    // Set default placeholder values
    const defaultPlaceholder: BedLine = {
        seqid: "placeholder",
        start: 0,  // Will be overridden for each position
        end: 0,    // Will be overridden for each position
        name: "empty",
        score: 0,
        strand: "."
    };
    
    // Merge default with provided options
    const placeholderTemplate = { ...defaultPlaceholder, ...placeholderOptions };
    
    // Loop through the entire desired range and ensure each position exists
    for (let pos = startPos; pos <= endPos; pos++) {
        // Get entries at this position
        const entriesAtPos = bedData.getPos(pos);
        
        if (entriesAtPos.length > 0) {
            // If we have entries, add them to our complete range
            entriesAtPos.forEach(entry => {
                completeBedData.addLine(entry);
            });
        } else {
            // If no entries exist for this position, add a placeholder entry
            const placeholder: BedLine = {
                ...placeholderTemplate,
                start: pos,
                end: pos + 1
            };
            
            completeBedData.addLine(placeholder);
        }
    }
    
    return completeBedData;
}

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
        columnRatios: [0.9, 0.1], // plot, labels, legend
        rowRatiosPerColumn: [
            [0.1, 0.45, 0.025, 0.05, 0.025, 0.15, 0.025, 0.05, 0.025, 0.15], // pathogen, transcriptome, spacer, donor fullgenome barplot, spacer, donor expression, spacer, acceptor fullgenome barplot, spacer, acceptor expression
            [0.1, 0.45, 0.025, 0.05, 0.025, 0.15, 0.025, 0.05, 0.025, 0.15], // pathogen, transcriptome, spacer, donor fullgenome barplot, spacer, donor expression, spacer, acceptor fullgenome barplot, spacer, acceptor expression
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

            // transform data into means
            const donor_fullGenomeMeanData = computeMeanScores(this.bedFiles.donors.data);
            const donor_fullGenomePlot = new BarPlot(donor_fullGenomePlotSvg, {
                dimensions: donor_fullGenomePlotDimensions,
                bedData: donor_fullGenomeMeanData,
                xScale: xScale,
                color: "#F78154"
            });
            this.grid.setCellData(0, 3, donor_fullGenomePlot);
            donor_fullGenomePlot.plot();

            // Add y-axis to the donor barplot in the second column
            const donor_barplot_axis_svg = this.grid.getCellSvg(1, 3);
            if (donor_barplot_axis_svg) {
                const axisDimensions = this.grid.getCellDimensions(1, 3);
                
                // Create y-axis scale for donor barplot
                const maxDonorScore = Math.max(...donor_fullGenomeMeanData.getData().map(d => d.score));
                const yScale = d3.scaleLinear()
                    .domain([0, maxDonorScore])
                    .range([axisDimensions?.height || 0, 0]);
                
                // Add y-axis
                const yAxis = d3.axisRight(yScale)
                    .ticks(2)
                    .tickSize(3);
                
                donor_barplot_axis_svg.append("g")
                    .attr("class", "y-axis")
                    .style("font-size", `${this.fontSize}px`)
                    .style("color", "#333")
                    .call(yAxis);
            }
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

            let donor_positions: number[] = []; // gather list of donors positions
            for (const donor of this.transcriptome.donors()) {
                donor_positions.push(donor);
            }
            console.log("donor_positions", donor_positions);
            // sort donor positions
            donor_positions.sort((a, b) => a - b);
            const donor_dataPlotArray = new DataPlotArray({
                svg: donor_dataPlotArraySvg,
                dimensions: donor_dataPlotArrayDimensions,
                coordinateLength: this.transcriptome.getEnd(),
                elements: donor_positions,
                elementWidth: this.zoomWindowWidth,
                maxValue: 1,
            });
            this.grid.setCellData(0, 5, donor_dataPlotArray);
            donor_dataPlotArray.plot();

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

                    console.log("donor bedfiles", this.bedFiles.donors.data);

                    // Extract subset of donor data around the donor position
                    const windowSize = 5; // ±5 positions around the donor
                    const donor_range = this.bedFiles.donors.data.getRange(donor - this.zoomWidth, donor + this.zoomWidth);
                    const full_donor_range = fill_empty_bed_positions(donor_range, donor - this.zoomWidth, donor + this.zoomWidth);
                    const donorsMaxYScale = computeMaxNonOutlierScore(this.bedFiles.donors.data);
                    const yScale = d3.scaleLinear()
                        .domain([0, donorsMaxYScale])
                        .range([donor_zoomPlotDimensions.height, 0]);

                    // Create x scale for the plot
                    const xScale = d3.scaleLinear()
                        .domain([donor - windowSize, donor + windowSize])
                        .range([0, donor_zoomPlotDimensions.width]);

                    // Create and render the boxplot
                    const boxPlot = new BoxPlot(donor_zoomPlotSvg, {
                        dimensions: donor_zoomPlotDimensions,
                        bedData: { data: full_donor_range },
                        xScale: xScale,
                        yScale: yScale,
                        showOutliers: false,
                        colors: {
                            box: "#F78154",
                            median: "black",
                            whisker: "black",
                            outlier: "black",
                        }
                    });

                    boxPlot.plot();

                    // build connector in the overlay between zoom and original points
                    const donor_spacerSvg = this.grid.getCellSvg(0, 4);
                    if (donor_spacerSvg) {
                        const donor_spacerDimensions = this.grid.getCellDimensions(0, 4);
                        const donor_spacerCoordinates = this.grid.getCellCoordinates(0, 4);
                        const donor_spacerPlotDimensions = {
                            width: donor_spacerDimensions?.width || 0,
                            height: donor_spacerDimensions?.height || 0,
                            x: donor_spacerCoordinates?.x || 0,
                            y: donor_spacerCoordinates?.y || 0,
                            fontSize: this.fontSize,
                        };

                        const zoom_intervals: [[number, number], [number, number]] = donor_dataPlotArray.getElementMapping(i);
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

            // Add y-axis for each donor boxplot
            const donor_boxplot_axis_svg = this.grid.getCellSvg(1, 5);
            if (donor_boxplot_axis_svg && donor_positions.length > 0) {
                const axisDimensions = this.grid.getCellDimensions(1, 5);
                const donorsMaxYScale = computeMaxNonOutlierScore(this.bedFiles.donors.data);
                
                // Create y-axis scale
                const yScale = d3.scaleLinear()
                    .domain([0, donorsMaxYScale])
                    .range([axisDimensions?.height || 0, 0]);
                
                // Add y-axis
                const yAxis = d3.axisRight(yScale)
                    .ticks(5)
                    .tickSize(3);
                
                donor_boxplot_axis_svg.append("g")
                    .attr("class", "y-axis")
                    .style("font-size", `${this.fontSize}px`)
                    .style("color", "#333")
                    .call(yAxis);
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

            // transform data into means
            const acceptor_fullGenomeMeanData = computeMeanScores(this.bedFiles.acceptors.data);
            const acceptor_fullGenomePlot = new BarPlot(acceptor_fullGenomePlotSvg, {
                dimensions: acceptor_fullGenomePlotDimensions,
                bedData: acceptor_fullGenomeMeanData,
                xScale: xScale,
                color: "#5FAD56"
            });
            this.grid.setCellData(0, 3, acceptor_fullGenomePlot);
            acceptor_fullGenomePlot.plot();

            // Add y-axis to the acceptor barplot in the second column
            const acceptor_barplot_axis_svg = this.grid.getCellSvg(1, 7);
            if (acceptor_barplot_axis_svg) {
                const axisDimensions = this.grid.getCellDimensions(1, 7);
                
                // Create y-axis scale for acceptor barplot
                const maxAcceptorScore = Math.max(...acceptor_fullGenomeMeanData.getData().map(d => d.score));
                const yScale = d3.scaleLinear()
                    .domain([0, maxAcceptorScore])
                    .range([axisDimensions?.height || 0, 0]);
                
                // Add y-axis
                const yAxis = d3.axisRight(yScale)
                    .ticks(3)
                    .tickSize(3);
                
                acceptor_barplot_axis_svg.append("g")
                    .attr("class", "y-axis")
                    .style("font-size", `${this.fontSize}px`)
                    .style("color", "#333")
                    .call(yAxis);
            }
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
            for (const acceptor of this.transcriptome.acceptors()) {
                acceptor_positions.push(acceptor);
            }
            console.log("acceptor_positions", acceptor_positions);
            // sort acceptor positions
            acceptor_positions.sort((a, b) => a - b);
            const acceptor_dataPlotArray = new DataPlotArray({
                svg: acceptor_dataPlotArraySvg,
                dimensions: acceptor_dataPlotArrayDimensions,
                coordinateLength: this.transcriptome.getEnd(),
                elements: acceptor_positions,
                elementWidth: this.zoomWindowWidth,
                maxValue: 1,
            });
            this.grid.setCellData(0, 9, acceptor_dataPlotArray);
            acceptor_dataPlotArray.plot();

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
                        .attr("fill", "#5FAD56");

                    // Extract subset of SJ data around the acceptor position
                    const windowSize = 5; // ±5 positions around the donor
                    const acceptor_range = this.bedFiles.acceptors.data.getRange(acceptor - this.zoomWidth, acceptor + this.zoomWidth).explode();
                    const full_acceptor_range = fill_empty_bed_positions(acceptor_range, acceptor - this.zoomWidth, acceptor + this.zoomWidth);
                    const acceptorsMaxYScale = computeMaxNonOutlierScore(this.bedFiles.acceptors.data);
                    const yScale = d3.scaleLinear()
                        .domain([0, acceptorsMaxYScale])
                        .range([acceptor_zoomPlotDimensions.height, 0]);

                    // Create x scale for the plot
                    const xScale = d3.scaleLinear()
                        .domain([acceptor - windowSize, acceptor + windowSize])
                        .range([0, acceptor_zoomPlotDimensions.width]);

                    // Create and render the boxplot
                    const boxPlot = new BoxPlot(acceptor_zoomPlotSvg, {
                        dimensions: acceptor_zoomPlotDimensions,
                        bedData: { data: full_acceptor_range },
                        xScale: xScale,
                        yScale: yScale,
                        showOutliers: false,
                        colors: {
                            box: "#5FAD56",
                            median: "black",
                            whisker: "black",
                            outlier: "black",
                        }
                    });

                    boxPlot.plot();

                    // build connector in the overlay between zoom and original points
                    const acceptor_spacerSvg = this.grid.getCellSvg(0, 8);
                    if (acceptor_spacerSvg) {
                        const acceptor_spacerDimensions = this.grid.getCellDimensions(0, 8);
                        const acceptor_spacerCoordinates = this.grid.getCellCoordinates(0, 8);
                        const acceptor_spacerPlotDimensions = {
                            width: acceptor_spacerDimensions?.width || 0,
                            height: acceptor_spacerDimensions?.height || 0,
                            x: acceptor_spacerCoordinates?.x || 0,
                            y: acceptor_spacerCoordinates?.y || 0,
                            fontSize: this.fontSize,
                        };

                        const zoom_intervals: [[number, number], [number, number]] = acceptor_dataPlotArray.getElementMapping(i);
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
            // Add y-axis for each acceptor boxplot
            const acceptor_boxplot_axis_svg = this.grid.getCellSvg(1, 9);
            if (acceptor_boxplot_axis_svg && acceptor_positions.length > 0) {
                const axisDimensions = this.grid.getCellDimensions(1, 9);
                const acceptorsMaxYScale = computeMaxNonOutlierScore(this.bedFiles.acceptors.data);
                
                // Create y-axis scale
                const yScale = d3.scaleLinear()
                    .domain([0, acceptorsMaxYScale])
                    .range([axisDimensions?.height || 0, 0]);
                
                // Add y-axis
                const yAxis = d3.axisRight(yScale)
                    .ticks(5)
                    .tickSize(3);
                
                acceptor_boxplot_axis_svg.append("g")
                    .attr("class", "y-axis")
                    .style("font-size", `${this.fontSize}px`)
                    .style("color", "#333")
                    .call(yAxis);
            }
        }

        this.grid.promote(0, 0);
        this.grid.promote(0, 3);
        this.grid.promote(0, 5);
    }
}
