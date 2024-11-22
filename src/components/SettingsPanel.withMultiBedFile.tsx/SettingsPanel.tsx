import React from "react";
import { Card, Col, Row, Form, Button } from "react-bootstrap";
import "./SettingsPanel.css";
import { BedFile } from "sparrowgenomelib";

interface SettingsPanelProps {
    onGTFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fontSize: number;
    onFontSizeChange: (value: number) => void;
    width: number;
    onWidthChange: (value: number) => void;
    height: number;
    onHeightChange: (value: number) => void;
    bedFiles: BedFile[];
    onBedFileUpload: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void;
    onAddBedFile: () => void;
    onRemoveBedFile: (index: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    onGTFUpload,
    fontSize,
    onFontSizeChange,
    width,
    onWidthChange,
    height,
    onHeightChange,
    bedFiles,
    onBedFileUpload,
    onAddBedFile,
    onRemoveBedFile,
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
                        </Form.Group>

                        {/* Dynamic BED File Uploads */}
                        <Form.Group controlId="bedFiles">
                            <Form.Label>
                                <Row>
                                    <Col md={9}>Bed Files</Col>
                                    <Col>
                                        <Button variant="outline-primary" size="sm" onClick={onAddBedFile}>
                                            +
                                        </Button>
                                    </Col>
                                </Row>
                            </Form.Label>
                            {bedFiles.map((bedFile, index) => (
                                <div key={index} className="bed-file-upload">
                                    <Row>
                                        <Col md={9}>
                                            <Form.Control
                                                type="file"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBedFileUpload(index, e)}
                                            />
                                            {bedFile.status === -1 && (
                                                <div className="text-danger">Error parsing file: {bedFile.fileName}</div>
                                            )}
                                        </Col>
                                        <Col>
                                            <Button variant="outline-danger" size="sm" onClick={() => onRemoveBedFile(index)}>
                                                -
                                            </Button>
                                        </Col>
                                    </Row>
                                </div>
                            ))}
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
