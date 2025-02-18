import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

import { Transcriptome, SJFile, BedFile } from 'sparrowgenomelib';
import { SplicePlot } from './SplicePlot';

interface SplicePlotWrapperProps {
    transcriptome: Transcriptome;
    conservationBedFile: BedFile;
    sjFiles: {donors: SJFile, acceptors: SJFile};
    zoomWidth: number;
    zoomWindowWidth: number;
    width: number;
    height: number;
    fontSize: number;
}

const SplicePlotWrapper: React.FC<SplicePlotWrapperProps> = ({ 
    transcriptome,
    conservationBedFile,
    sjFiles: sjFiles, 
    zoomWidth, 
    zoomWindowWidth,
    width, 
    height, 
    fontSize 
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const handleDownload = () => {
        if (svgRef.current) {
            const svgElement = svgRef.current;
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'splice_plot.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        const splicePlot = new SplicePlot(svg, { 
            transcriptome,
            conservationBedFile,
            sjFiles: sjFiles, 
            zoomWidth, 
            zoomWindowWidth,
            width, 
            height, 
            fontSize });
        splicePlot.plot();
    }, [transcriptome, conservationBedFile, sjFiles, zoomWidth, zoomWindowWidth, width, height, fontSize]);

    return (
        <div>
            <svg ref={svgRef}></svg>
            <button onClick={handleDownload}>Download SVG</button>
        </div>
    );
};

export default SplicePlotWrapper;
