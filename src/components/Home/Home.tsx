import React, { useState } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import SplicePlotWrapper from "../SplicePlot/SplicePlotWrapper";

import { parseBed } from "../../utils/Parsers/Parsers";
import { BedFile, BedData, Transcriptome } from "../../types/api";

const Home: React.FC = () => {
    const [transcriptome, setTranscriptome] = useState<Transcriptome>(new Transcriptome());
    const [zoomWidth, setZoomWidth] = useState<number>(5);
    const [zoomWindowWidth, setZoomWindowWidth] = useState<number>(75);
    const [fontSize, setFontSize] = useState<number>(10);
    const [width, setWidth] = useState<number>(1100);
    const [height, setHeight] = useState<number>(700);
    const [bedFiles, setBedFiles] = useState<{
        donors: BedFile;
        acceptors: BedFile;
    }>({donors: {data: new BedData(), fileName: "", status: 0},
        acceptors: {data: new BedData(), fileName: "", status: 0}});
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

    const handleBedFileUpload = async (type: 'donors' | 'acceptors', event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const bed_data: BedFile = await parseBed(file);
                bed_data.data.sort();
                setBedFiles(prevBedFiles => ({
                    ...prevBedFiles,
                    [type]: { ...bed_data, status: 1 }
                }));
            } catch (error) {
                setBedFiles(prevBedFiles => ({
                    ...prevBedFiles,
                    [type]: { ...prevBedFiles[type], status: -1 }
                }));
                setErrorMessage("Unable to parse the file. Please make sure the file is in BED format.");
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
                donorsStatus={bedFiles.donors.status}
                acceptorsStatus={bedFiles.acceptors.status}
                onBEDUpload={handleBedFileUpload}
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
                    bedFiles={bedFiles}
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
