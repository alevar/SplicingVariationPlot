import React from "react";
import { Card, Form } from "react-bootstrap";
import "./SettingsPanel.css";

interface SettingsPanelProps {
    gtfStatus: number;
    onGTFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    conservationStatus: number;
    onConservationBedUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    donorsStatus: number;
    acceptorsStatus: number;
    onSJUpload: (type: 'donors' | 'acceptors', event: React.ChangeEvent<HTMLInputElement>) => void;
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
    conservationStatus,
    onConservationBedUpload,
    donorsStatus,
    acceptorsStatus,
    onSJUpload,
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
    return (
        <div className="settings-panel">
            <Card className="settings-card">
                <Card.Body className="settings-body">
                    <Card.Title className="settings-title">Settings</Card.Title>
                    <Form>
                        {/* GTF Upload */}
                        <Form.Group controlId="gtfUpload">
                            <Form.Label>Pathogen GTF</Form.Label>
                            <Form.Control type="file" onChange={onGTFUpload} />
                            {gtfStatus === -1 && (
                                <div className="text-danger">Error parsing gtf file</div>
                            )}
                        </Form.Group>

                        {/* Conservation Bed Upload */}
                        <Form.Group controlId="conservationBedUpload">
                            <Form.Label>Conservation BED</Form.Label>
                            <Form.Control type="file" onChange={onConservationBedUpload} />
                            {conservationStatus === -1 && (
                                <div className="text-danger">Error parsing conservation file</div>
                            )}
                        </Form.Group>

                        <Form.Group controlId="donorsSJUpload">
                            <Form.Label>Donors SJ</Form.Label>
                            <Form.Control type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSJUpload("donors", e)} />
                            {donorsStatus === -1 && (
                                <div className="text-danger">Error parsing donors file</div>
                            )}
                        </Form.Group>

                        <Form.Group controlId="acceptorsSJUpload">
                            <Form.Label>Acceptors SJ</Form.Label>
                            <Form.Control type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSJUpload("acceptors", e)} />
                            {acceptorsStatus === -1 && (
                                <div className="text-danger">Error parsing acceptors file</div>
                            )}
                        </Form.Group>

                        <Form.Group controlId="zoomWidth">
                            <Form.Label>Zoom Width</Form.Label>
                            <Form.Control 
                                type="number" 
                                value={zoomWidth}
                                onChange={(e) => onZoomWidthChange(Number(e.target.value))}/>
                        </Form.Group>

                        <Form.Group controlId="zoomWindowWidth">
                            <Form.Label>Zoom Window Width</Form.Label>
                            <Form.Control 
                                type="number" 
                                value={zoomWindowWidth}
                                onChange={(e) => onZoomWindowWidthChange(Number(e.target.value))}/>
                        </Form.Group>

                        {/* Font Size */}
                        <Form.Group controlId="fontSize">
                            <Form.Label>Font Size</Form.Label>
                            <Form.Control
                                type="number"
                                value={fontSize}
                                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        {/* Width */}
                        <Form.Group controlId="width">
                            <Form.Label>Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={width}
                                onChange={(e) => onWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        {/* Height */}
                        <Form.Group controlId="height">
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
