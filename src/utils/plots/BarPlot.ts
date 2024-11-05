import * as d3 from "d3";

import { Dimensions, BedData } from '../../types/api';

interface BarPlotData {
    dimensions: Dimensions;
    xScale: d3.ScaleLinear<number, number>;
    bedData: BedData;
    color: string;
    yScale?: d3.ScaleLinear<number, number>; // Optional yScale parameter
}

export class BarPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private bedData: BedData;
    private xScale: d3.ScaleLinear<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private useProvidedYScale: boolean = false;
    private color: string;

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: BarPlotData) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.bedData = data.bedData;
        this.xScale = data.xScale;
        this.color = data.color;

        this.yScale = data.yScale ?? d3.scaleLinear();
        this.useProvidedYScale = data.yScale !== undefined;
    }

    public get_yScale(): d3.ScaleLinear<number, number> {
        return this.yScale;
    }

    public plot(): void {

        // Create the y-axis scale
        if (!this.useProvidedYScale) {
            this.yScale = d3.scaleLinear()
                .domain([0, this.bedData.maxScore()])
                .range([0,this.dimensions.height]);
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
                .tickFormat(null));

        const minBarWidth = 5;
        this.svg.selectAll(".bar")
            .data(this.bedData.getData())
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => this.xScale(d.start)) // Position the bar based on start
            .attr("y", d => this.yScale(d.score)) // Position the top of the bar based on score
            .attr("width", d => Math.min(this.xScale(d.end) - this.xScale(d.start), minBarWidth)) // Width is based on start to end
            .attr("height", d => this.dimensions.y + this.dimensions.height - this.yScale(d.score)) // Height based on score
            .attr("fill", this.color);
    }
}