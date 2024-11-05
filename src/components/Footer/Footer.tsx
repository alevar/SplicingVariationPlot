import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import jhu_logo from '../../assets/university.shield.blue.svg';
import som_logo from '../../assets/medicine.shield.blue.svg';
import sph_logo from '../../assets/bloomberg.shield.blue.svg';

const Footer: React.FC = () => {
    return (
        <div className="bg-light border-top">
            <footer className="footer mt-auto py-3">
                <Container>
                    <Row className="align-items-center">
                        <Col md={1}>
                            <Nav.Link href="https://engineering.jhu.edu/" className="d-flex align-items-center">
                                <img src={jhu_logo} alt="JHU Logo" style={{ height: '40px', marginRight: '15px' }} />
                            </Nav.Link>
                        </Col>

                        <Col md={2}>
                            <a className="text-muted">CCB &copy; {new Date().getFullYear()}</a>
                        </Col>

                        <Col md={4} className="text-center">
                            <ul className="nav">
                                <li className="nav-item">
                                    <Link to="/" className="nav-link px-2 text-body-secondary">Home</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/contact" className="nav-link px-2 text-body-secondary">Contact Us</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/about" className="nav-link px-2 text-body-secondary">About</Link>
                                </li>
                            </ul>

                        </Col>

                        <Col md={3}>
                            <a href="/privacy-policy">Privacy Policy</a> | <a href="/terms-of-service">Terms of Service</a>
                        </Col>

                        <Col md={1}>
                            <Nav.Link href="https://www.hopkinsmedicine.org/som/" className="d-flex align-items-center">
                                <img src={som_logo} alt="SOM Logo" style={{ height: '40px', marginRight: '15px' }} />
                            </Nav.Link>
                        </Col>

                        <Col md={1} className="text-end">
                            <Nav.Link href="https://publichealth.jhu.edu/" className="d-flex align-items-center">
                                <img src={sph_logo} alt="SPH Logo" style={{ height: '40px', marginRight: '15px' }} />
                            </Nav.Link>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </div>
    );
};

export default Footer;
