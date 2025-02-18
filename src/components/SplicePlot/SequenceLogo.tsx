import * as d3 from "d3";
import { Dimensions, SJLine } from 'sparrowgenomelib';

interface SequenceLogoData {
    dimensions: Dimensions;
    sjData: {
        data: SJLine[];
    };
    xScale: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>;
    colors?: { [key: string]: string };
}

export class SequenceLogo {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private sjData: SJLine[];
    private xScale: d3.ScaleLinear<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private useProvidedYScale: boolean = false;
    private colors: { [key: string]: string };
    private baseWidth: number;

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: SequenceLogoData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.sjData = data.sjData.data;
        this.xScale = data.xScale;
        this.colors = data.colors ?? {
            'A': '#32CD32', // Green
            'C': '#1E90FF', // Blue
            'G': '#FFD700', // Gold
            'T': '#DC143C', // Crimson
            'N': '#808080'  // Gray
        };
        this.yScale = data.yScale ?? d3.scaleLinear();
        this.useProvidedYScale = data.yScale !== undefined;
        
        // Calculate base width based on available space
        const uniquePositions = new Set(this.sjData.map(d => d.position)).size/2;
        this.baseWidth = this.dimensions.width / uniquePositions;
    }

    public get_yScale(): d3.ScaleLinear<number, number> {
        return this.yScale;
    }

    private getNucleotideCounts(position: SJLine): { [key: string]: number } {
        return {
            'A': position.A,
            'C': position.C,
            'G': position.G,
            'T': position.T,
            'N': position.N
        };
    }

    private calculateRelativeHeights(counts: { [key: string]: number }): { [key: string]: number } {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) return {};

        return Object.entries(counts).reduce((acc, [key, value]) => {
            acc[key] = value / total;
            return acc;
        }, {} as { [key: string]: number });
    }

    private createScaledLetter(
        nuc: string,
        x: number,
        yPosition: number,
        letterHeight: number
    ): void {
        // Create a group for the letter
        const letterGroup = this.svg.append('g')
            .attr('transform', `translate(${x}, ${yPosition})`);

        // Calculate scaling factors
        const scaleY = letterHeight / this.baseWidth;

        // Add the letter with vertical scaling only
        letterGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')
            .attr('fill', this.colors[nuc])
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .attr('font-size', `${this.baseWidth}px`)
            .attr('transform', `scale(1, ${scaleY})`)
            .attr('transform-origin', '0 0')
            .text(nuc);
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

    public plot(): void {
        // Clear existing content
        this.svg.selectAll("*").remove();

        // Create background
        this.createBackgroundRect();

        // Set up y-scale if not provided
        if (!this.useProvidedYScale) {
            this.yScale = d3.scaleLinear()
                .domain([0, 1])  // Relative abundance (0 to 1)
                .range([this.dimensions.height, 0]);
        }

        // Sort data by position
        const sortedData = [...this.sjData].sort((a, b) => a.position - b.position);

        // Fixed order of nucleotides
        const nucleotideOrder = ['A', 'C', 'G', 'T', 'N'];

        // Process each position
        sortedData.forEach(position => {
            const x = this.xScale(position.position);
            const counts = this.getNucleotideCounts(position);
            const relativeHeights = this.calculateRelativeHeights(counts);
            
            let yOffset = this.dimensions.height;

            // Draw letters in fixed order (A, C, G, T, N)
            nucleotideOrder.forEach(nuc => {
                if (counts[nuc] > 0) {
                    const frequency = relativeHeights[nuc];
                    const letterHeight = this.dimensions.height * frequency;

                    // Create scaled letter
                    this.createScaledLetter(nuc, x, yOffset - letterHeight, letterHeight);

                    yOffset -= letterHeight;
                }
            });
        });
    }
}