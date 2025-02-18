import React, { useState } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import SplicePlotWrapper from "../SplicePlot/SplicePlotWrapper";

import { SJFile, SJLine, SJData, parseBed, BedFile, BedData, Transcriptome } from 'sparrowgenomelib';

function parseSJ(sjFileName: File): Promise<SJFile> {
    return new Promise((resolve, reject) => {
        const sjFile: SJFile = {
            data: new SJData(),
            fileName: sjFileName.name,
            status: 1,
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const lines = result.split('\n');
                // skip header line
                lines.forEach((line, idx) => {
                    if (idx === 0) {
                        return;
                    }
                    // skip empty lines
                    if (line.trim() === '') {
                        return;
                    }
                    const fields = line.split('\t');
                    if (fields.length === 7) {
                        const [seqid, position, A, C, G, T, N] = fields;
                        const sjLine: SJLine = {
                            seqid: seqid,
                            position: parseInt(position),
                            A: parseInt(A),
                            C: parseInt(C),
                            G: parseInt(G),
                            T: parseInt(T),
                            N: parseInt(N),
                        };
                        sjFile.data.addLine(sjLine);
                    } else {
                        throw new Error(`Invalid line format: ${line}`);
                    }
                });
                resolve(sjFile);
            } catch (error) {
                reject(new Error('Failed to parse SJ file'));
            }
        };
        reader.onerror = () => {
            reject(new Error('Failed to read the file'));
        };
        reader.readAsText(sjFileName);
    });
}

const Home: React.FC = () => {
    const [transcriptome, setTranscriptome] = useState<Transcriptome>(new Transcriptome());
    const [zoomWidth, setZoomWidth] = useState<number>(5);
    const [zoomWindowWidth, setZoomWindowWidth] = useState<number>(75);
    const [fontSize, setFontSize] = useState<number>(10);
    const [width, setWidth] = useState<number>(1100);
    const [height, setHeight] = useState<number>(700);
    const [conservationBedFile, setConservationBedFile] = useState<BedFile>({data: new BedData(), fileName: "", status: 0});
    const [sjFiles, setSJFiles] = useState<{
        donors: SJFile;
        acceptors: SJFile;
    }>({donors: {data: new SJData(), fileName: "", status: 0},
        acceptors: {data: new SJData(), fileName: "", status: 0}});
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleGtfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const txdata = await Transcriptome.create(file);
                setTranscriptome(txdata);
            } catch (error) {
                setTranscriptome(new Transcriptome());
                setErrorMessage("Unable to parse the file. Please make sure the file is in GTF format. Try to run gffread -T to prepare your file.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleConservationBedFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const bed_data: BedFile = await parseBed(file);
                bed_data.data.sort();
                setConservationBedFile({ ...bed_data, status: 1 });
            } catch (error) {
                setConservationBedFile({ ...conservationBedFile, status: -1 });
                setErrorMessage("Unable to parse the file. Please make sure the file is in BED format.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleSJFileUpload = async (type: 'donors' | 'acceptors', event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const sj_data: SJFile = await parseSJ(file);
                sj_data.data.sort();
                setSJFiles(prevSJFiles => ({
                    ...prevSJFiles,
                    [type]: { ...sj_data, status: 1 }
                }));
            } catch (error) {
                setSJFiles(prevSJFiles => ({
                    ...prevSJFiles,
                    [type]: { ...prevSJFiles[type], status: -1 }
                }));
                setErrorMessage("Unable to parse the file. Please make sure the file is in SJ format (seqid, position, A, C, G, T, N).");
                setErrorModalVisible(true);
            }
        }
    };
    

    const closeErrorModal = () => {
        setErrorModalVisible(false);
    };

    return (
        <div className="splicemap-plot">
            <SettingsPanel
                gtfStatus={1}
                onGTFUpload={handleGtfUpload}
                conservationStatus={conservationBedFile.status}
                onConservationBedUpload={handleConservationBedFileUpload}
                donorsStatus={sjFiles.donors.status}
                acceptorsStatus={sjFiles.acceptors.status}
                onSJUpload={handleSJFileUpload}
                zoomWidth={zoomWidth}
                onZoomWidthChange={setZoomWidth}
                zoomWindowWidth={zoomWindowWidth}
                onZoomWindowWidthChange={setZoomWindowWidth}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
            />

            <div className="visualization-container">
                <SplicePlotWrapper
                    transcriptome={transcriptome}
                    conservationBedFile={conservationBedFile}
                    sjFiles={sjFiles}
                    zoomWidth={zoomWidth}
                    zoomWindowWidth={zoomWindowWidth}
                    width={width}
                    height={height}
                    fontSize={fontSize}
                />
            </div>

            <ErrorModal
                visible={errorModalVisible}
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </div>
    );
};

export default Home;
