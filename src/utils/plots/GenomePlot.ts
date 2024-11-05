export class GenomePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private genome_length: number;
    private gtf_data: any;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genome_length: number, gtf_data: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genome_length = genome_length;
        this.gtf_data = gtf_data;
    }

    public plot(): void {
        this.svg.append('rect')
            .attr('x', 0)
            .attr('y', this.dimensions["y"])
            .attr('width', this.dimensions["width"])
            .attr('height', this.dimensions["height"])
            .attr('rx', this.dimensions["height"] / 2)
            .attr('ry', this.dimensions["height"] / 2)
            .style('fill', '#dddddd');

        for (const component of this.gtf_data["genome_components"]) {
            if (component["type"] === "ltr") {
                this.svg.append('rect')
                    .attr('x', (component["position"][0] / this.genome_length) * this.dimensions["width"])
                    .attr('y', this.dimensions["y"])
                    .attr('width', ((component["position"][1] - component["position"][0]) / this.genome_length) * this.dimensions["width"])
                    .attr('height', this.dimensions["height"])
                    .attr('rx', this.dimensions["height"] / 2)
                    .attr('ry', this.dimensions["height"] / 2)
                    .style('fill', '#3652AD');
            }
        }
        for (const component of this.gtf_data["genome_components"]) {
            if (component["type"] === "ltr") {
                // add text label to the middle of the rectangle
                this.svg.append('text')
                    .attr('x', (component["position"][0] / this.genome_length) * this.dimensions["width"] + (((component["position"][1] - component["position"][0]) / this.genome_length) * this.dimensions["width"]) / 2)
                    .attr('y', (this.dimensions["y"]) + (this.dimensions["height"] / 1.25))
                    .attr('text-anchor', 'middle')
                    .style('fill', 'white')
                    .style('font-size', this.dimensions["font_size"] + "px")
                    .text(component["name"]);
            }
        }
    }
}