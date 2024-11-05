import * as d3 from "d3";
import { Dimensions, BedData } from '../../types/api';

interface LinePlotData {
    dimensions: Dimensions;
    bedData: BedData;
    color: string;
    xScale: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>; // Optional yScale parameter
}

export class LinePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private bedData: BedData;
    private xScale: d3.ScaleLinear<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private useProvidedYScale: boolean = false;
    private color: string;

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: LinePlotData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.bedData = data.bedData;
        this.xScale = data.xScale;
        this.color = data.color;

        // Use provided yScale if available, otherwise initialize a new scale
        this.yScale = data.yScale ?? d3.scaleLinear();
        this.useProvidedYScale = data.yScale !== undefined;
    }

    public get_yScale(): d3.ScaleLinear<number, number> {
        return this.yScale;
    }

    public plot(): void {

        // Check if yScale is already set (provided externally). If not, set it based on bedData.
        if (!this.useProvidedYScale) {
            this.yScale = d3.scaleLinear()
                .domain([0, this.bedData.maxScore()])
                .range([this.dimensions.height, 0]); // Reverse range if needed for correct orientation
        }

        // Add a background rectangle for the grid
        this.svg.append("rect")
            .attr("class", "grid-background")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.dimensions.width)
            .attr("height", this.dimensions.height)
            .attr("fill", "#f7f7f7")
            .attr("fill-opacity", 0.75);

        // Add horizontal grid lines
        this.svg.append("g")
            .attr("class", "grid")
            .attr("stroke", "rgba(0, 0, 0, 0.1)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.3)
            .call(d3.axisLeft(this.yScale)
                .ticks(2)
                .tickSize(-this.dimensions.width)
                .tickFormat(null)
            );

        // Prepare data points for the line plot
        const lineData = this.bedData.getData().flatMap(d => {
            const points = [];
            for (let pos = d.start; pos <= d.end; pos++) {
                points.push({ x: this.xScale(pos), y: this.yScale(d.score) });
            }
            return points;
        });

        // Define the line generator
        const lineGenerator = d3.line<{ x: number, y: number }>()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveMonotoneX); // Smooth the line

        // Draw the line path
        this.svg.append("path")
            .datum(lineData)
            .attr("class", "line")
            .attr("d", lineGenerator)
            .attr("fill", "none")
            .attr("stroke", this.color)
            .attr("stroke-width", 2);

        // Draw circles at each data point
        this.svg.selectAll(".point")
            .data(lineData)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 3)
            .attr("fill", this.color);
    }
}
