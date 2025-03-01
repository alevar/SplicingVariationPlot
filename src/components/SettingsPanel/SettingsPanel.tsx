import React, { useState } from "react";
import { Card, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { InfoCircle } from "react-bootstrap-icons";
import "./SettingsPanel.css";

interface SettingsPanelProps {
    gtfStatus: number;
    onGTFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    donorsStatus: number;
    acceptorsStatus: number;
    onBEDUpload: (type: 'donors' | 'acceptors', event: React.ChangeEvent<HTMLInputElement>) => void;
    zoomWidth: number;
    onZoomWidthChange: (value: number) => void;
    zoomWindowWidth: number;
    onZoomWindowWidthChange: (value: number) => void;
    fontSize: number;
    onFontSizeChange: (value: number) => void;
    width: number;
    onWidthChange: (value: number) => void;
    height: number;
    onHeightChange: (value: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    gtfStatus,
    onGTFUpload,
    donorsStatus,
    acceptorsStatus,
    onBEDUpload,
    zoomWidth,
    onZoomWidthChange,
    zoomWindowWidth,
    onZoomWindowWidthChange,
    fontSize,
    onFontSizeChange,
    width,
    onWidthChange,
    height,
    onHeightChange,
}) => {
    // Help tooltip content for each file type
    const tooltips = {
        gtf: (
            <Tooltip id="gtf-tooltip" className="tooltip-hover">
                <strong>GTF File Format Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {'chr1\tVIRUS\texon\t1000\t1200\t.\t+\t.\tgene_id "gene1"; transcript_id "transcript1";\n' +
                        'chr1\tVIRUS\tCDS\t1050\t1150\t.\t+\t0\tgene_id "gene1"; transcript_id "transcript1";'}
                </pre>
                <div>GTF files contain gene annotations with 9 tab-separated columns.</div>
            </Tooltip>
        ),
        donors: (
            <Tooltip id="donors-tooltip" className="tooltip-hover">
                <strong>Donors SJ File Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {'seqid\tposition\tA\tC\tG\tT\tN\n' +
                    'K03455.1\t738\t11\t2\t2051\t13\t0\n' +
                    'K03455.1\t739\t1652\t7\t406\t8\t4'}
                </pre>
                <div>Donor splice junction files contain genomic coordinates and data for each nucleotide. Expects header.</div>
            </Tooltip>
        ),
        acceptors: (
            <Tooltip id="acceptors-tooltip" className="tooltip-hover">
                <strong>Acceptors SJ File Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                {'seqid\tposition\tA\tC\tG\tT\tN\n' +
                    'K03455.1\t738\t11\t2\t2051\t13\t0\n' +
                    'K03455.1\t739\t1652\t7\t406\t8\t4'}
                </pre>
                <div>Acceptor splice junction files contain genomic coordinates and data for each nucleotide. Expects header.</div>
            </Tooltip>
        ),
    };

    // Helper component for upload fields with help tooltip that stays visible on hover
    const UploadFieldWithHelp = ({
        id,
        label,
        onChange,
        errorStatus,
        errorMessage,
        tooltipContent
    }: {
        id: string;
        label: string;
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        errorStatus?: number;
        errorMessage?: string;
        tooltipContent: JSX.Element;
    }) => {
        const [show, setShow] = useState(false);

        return (
            <Form.Group controlId={id} className="mb-3">
                <OverlayTrigger
                    placement="right"
                    show={show}
                    onToggle={setShow}
                    trigger={["click"]}
                    rootClose
                    rootCloseEvent="mousedown"
                    overlay={tooltipContent}
                >
                    <span
                        className="ms-2"
                        style={{ cursor: 'help' }}
                        onClick={() => setShow(!show)} // Toggle on click too
                    >
                        <InfoCircle size={16} />
                    </span>
                </OverlayTrigger>
                <Form.Label className="d-flex align-items-center">
                    {label}
                </Form.Label>
                <Form.Control type="file" onChange={onChange} />
                {errorStatus === -1 && (
                    <div className="text-danger">{errorMessage}</div>
                )}
            </Form.Group>
        );
    };

    return (
        <div className="settings-panel">
            <Card className="settings-card">
                <Card.Body className="settings-body">
                    <Card.Title className="settings-title">Settings</Card.Title>
                    <Form>
                        {/* GTF Upload with help tooltip */}
                        <UploadFieldWithHelp
                            id="gtfUpload"
                            label="Pathogen GTF"
                            onChange={onGTFUpload}
                            errorStatus={gtfStatus}
                            errorMessage="Error parsing GTF file"
                            tooltipContent={tooltips.gtf}
                        />

                        {/* Donors SJ Upload with help tooltip */}
                        <UploadFieldWithHelp
                            id="donorsBedUpload"
                            label="Donors BED"
                            onChange={(e) => onBEDUpload("donors", e)}
                            errorStatus={donorsStatus}
                            errorMessage="Error parsing donors file"
                            tooltipContent={tooltips.donors}
                        />

                        {/* Acceptors SJ Upload with help tooltip */}
                        <UploadFieldWithHelp
                            id="acceptorsBedUpload"
                            label="Acceptors BED"
                            onChange={(e) => onBEDUpload("acceptors", e)}
                            errorStatus={acceptorsStatus}
                            errorMessage="Error parsing acceptors file"
                            tooltipContent={tooltips.acceptors}
                        />

                        {/* Numeric input fields */}
                        <Form.Group controlId="zoomWidth" className="mb-3">
                            <Form.Label>Zoom Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={zoomWidth}
                                onChange={(e) => onZoomWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="zoomWindowWidth" className="mb-3">
                            <Form.Label>Zoom Window Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={zoomWindowWidth}
                                onChange={(e) => onZoomWindowWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="fontSize" className="mb-3">
                            <Form.Label>Font Size</Form.Label>
                            <Form.Control
                                type="number"
                                value={fontSize}
                                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="width" className="mb-3">
                            <Form.Label>Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={width}
                                onChange={(e) => onWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="height" className="mb-3">
                            <Form.Label>Height</Form.Label>
                            <Form.Control
                                type="number"
                                value={height}
                                onChange={(e) => onHeightChange(Number(e.target.value))}
                            />
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default SettingsPanel;