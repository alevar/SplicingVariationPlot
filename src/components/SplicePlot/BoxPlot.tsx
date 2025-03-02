import * as d3 from "d3";
import { Dimensions, BedLine, BedData } from 'sparrowgenomelib';

interface BoxPlotData {
    dimensions: Dimensions;
    bedData: {
        data: BedData;
    };
    xScale: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>;
    boxWidth?: number;
    colors?: {
        box: string;
        median: string;
        whisker: string;
        outlier: string;
    };
    showOutliers?: boolean; // New optional property to toggle outliers
}

interface BoxStats {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
    position: number;
}

export class BoxPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private bedData: BedData;
    private xScale: d3.ScaleLinear<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private useProvidedYScale: boolean = false;
    private boxWidth: number;
    private colors: {
        box: string;
        median: string;
        whisker: string;
        outlier: string;
    };
    private showOutliers: boolean; // Store the setting for showing outliers

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: BoxPlotData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.bedData = data.bedData.data;
        this.xScale = data.xScale;
        this.colors = data.colors ?? {
            box: '#69b3a2',
            median: '#000000',
            whisker: '#000000',
            outlier: '#e8504c'
        };
        this.yScale = data.yScale ?? d3.scaleLinear();
        this.useProvidedYScale = data.yScale !== undefined;
        this.showOutliers = data.showOutliers ?? true; // Default to true if not provided

        const uniquePositions = new Set();
        this.bedData.getData().forEach(d => {
            for (let pos = d.start; pos < d.end; pos++) {
                uniquePositions.add(pos);
            }
        });
        const numPositions = uniquePositions.size;
        this.boxWidth = data.boxWidth ?? (this.dimensions.width / (numPositions * 2));
    }

    public get_yScale(): d3.ScaleLinear<number, number> {
        return this.yScale;
    }

    private calculateBoxStats(position: number): BoxStats | null {
        const linesAtPosition = this.bedData.getPos(position);

        if (linesAtPosition.length === 0) {
            return null;
        }

        const scores = linesAtPosition.map(line => line.score);

        if (scores.length === 0) {
            return null;
        }

        scores.sort((a, b) => a - b);

        const min = d3.min(scores) ?? 0;
        const max = d3.max(scores) ?? 0;
        const q1 = d3.quantile(scores, 0.25) ?? min;
        const median = d3.quantile(scores, 0.5) ?? (min + max) / 2;
        const q3 = d3.quantile(scores, 0.75) ?? max;

        const iqr = q3 - q1;
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;

        const outliers = scores.filter(score => score < lowerFence || score > upperFence);

        const filteredScores = scores.filter(score => score >= lowerFence && score <= upperFence);
        const adjustedMin = filteredScores.length > 0 ? d3.min(filteredScores) ?? min : min;
        const adjustedMax = filteredScores.length > 0 ? d3.max(filteredScores) ?? max : max;

        return {
            min: adjustedMin,
            q1,
            median,
            q3,
            max: adjustedMax,
            outliers,
            position
        };
    }

    private createBackgroundRect(): void {
        this.svg.append("rect")
            .attr("class", "grid-background")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.dimensions.width)
            .attr("height", this.dimensions.height)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", "3");
    }

    private drawBoxPlot(stats: BoxStats): void {
        const x = this.xScale(stats.position);
        const center = x;
        const width = this.boxWidth;

        this.svg.append("rect")
            .attr("x", center - width / 2)
            .attr("y", this.yScale(stats.q3))
            .attr("width", width)
            .attr("height", this.yScale(stats.q1) - this.yScale(stats.q3))
            .attr("fill", this.colors.box)
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        this.svg.append("line")
            .attr("x1", center - width / 2)
            .attr("x2", center + width / 2)
            .attr("y1", this.yScale(stats.median))
            .attr("y2", this.yScale(stats.median))
            .attr("stroke", this.colors.median)
            .attr("stroke-width", 2);

        this.svg.append("line")
            .attr("x1", center)
            .attr("x2", center)
            .attr("y1", this.yScale(stats.q1))
            .attr("y2", this.yScale(stats.min))
            .attr("stroke", this.colors.whisker)
            .attr("stroke-width", 1);

        this.svg.append("line")
            .attr("x1", center - width / 4)
            .attr("x2", center + width / 4)
            .attr("y1", this.yScale(stats.min))
            .attr("y2", this.yScale(stats.min))
            .attr("stroke", this.colors.whisker)
            .attr("stroke-width", 1);

        this.svg.append("line")
            .attr("x1", center)
            .attr("x2", center)
            .attr("y1", this.yScale(stats.q3))
            .attr("y2", this.yScale(stats.max))
            .attr("stroke", this.colors.whisker)
            .attr("stroke-width", 1);

        this.svg.append("line")
            .attr("x1", center - width / 4)
            .attr("x2", center + width / 4)
            .attr("y1", this.yScale(stats.max))
            .attr("y2", this.yScale(stats.max))
            .attr("stroke", this.colors.whisker)
            .attr("stroke-width", 1);

        if (this.showOutliers) { // Conditionally render outliers
            stats.outliers.forEach(outlier => {
                this.svg.append("circle")
                    .attr("cx", center)
                    .attr("cy", this.yScale(outlier))
                    .attr("r", 3)
                    .attr("fill", this.colors.outlier);
            });
        }
    }

    public plot(): void {
        this.svg.selectAll("*").remove();
        this.createBackgroundRect();

        if (!this.useProvidedYScale) {
            const allScores = this.bedData.getData().map(d => d.score);
            const minScore = d3.min(allScores) ?? 0;
            const maxScore = d3.max(allScores) ?? 1;

            const padding = (maxScore - minScore) * 0.1;

            this.yScale = d3.scaleLinear()
                .domain([minScore - padding, maxScore + padding])
                .range([this.dimensions.height, 0]);
        }

        const positions = new Set<number>();
        this.bedData.getData().forEach(line => {
            for (let pos = line.start; pos < line.end; pos++) {
                positions.add(pos);
            }
        });

        Array.from(positions).sort((a, b) => a - b).forEach(position => {
            const stats = this.calculateBoxStats(position);
            if (stats) {
                this.drawBoxPlot(stats);
            }
        });
    }
}
