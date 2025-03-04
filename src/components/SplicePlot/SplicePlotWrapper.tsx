import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

import { Transcriptome, BedFile } from 'sparrowgenomelib';
import { SplicePlot } from './SplicePlot';
import './SplicePlotWrapper.css';

interface SplicePlotWrapperProps {
    transcriptome: Transcriptome;
    bedFiles: {donors: BedFile, acceptors: BedFile};
    zoomWidth: number;
    zoomWindowWidth: number;
    width: number;
    height: number;
    fontSize: number;
}

const SplicePlotWrapper: React.FC<SplicePlotWrapperProps> = ({ 
    transcriptome,
    bedFiles: bedFiles, 
    zoomWidth, 
    zoomWindowWidth,
    width, 
    height, 
    fontSize 
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const handleSvgDownload = () => {
        if (svgRef.current) {
            const svgElement = svgRef.current;
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'chimviz_plot.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handlePngDownload = () => {
        if (svgRef.current) {
            const svgElement = svgRef.current;
            const svgString = new XMLSerializer().serializeToString(svgElement);
            
            // Create a canvas element
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                // Create an image from the SVG
                const img = new Image();
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                img.onload = () => {
                    // Draw the image on the canvas
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert canvas to PNG
                    const pngUrl = canvas.toDataURL('image/png');
                    
                    // Download the PNG
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = 'chimviz_plot.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    // Clean up
                    URL.revokeObjectURL(url);
                };
                
                img.src = url;
            }
        }
    };

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        const splicePlot = new SplicePlot(svg, { 
            transcriptome,
            bedFiles: bedFiles, 
            zoomWidth, 
            zoomWindowWidth,
            width, 
            height, 
            fontSize });
        splicePlot.plot();
    }, [transcriptome, bedFiles, zoomWidth, zoomWindowWidth, width, height, fontSize]);

    return (
        <div className="plot-container" ref={containerRef}>
            <div className="svg-container">
                <svg ref={svgRef} width={width} height={height} preserveAspectRatio="xMinYMin meet"></svg>
            </div>
            <div className="download-buttons">
                <button className="download-button svg-button" onClick={handleSvgDownload}>
                    Download SVG
                </button>
                <button className="download-button png-button" onClick={handlePngDownload}>
                    Download PNG
                </button>
            </div>
        </div>
    );
};

export default SplicePlotWrapper;
