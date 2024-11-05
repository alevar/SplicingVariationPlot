import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import './ErrorModal.css';

interface ErrorModalProps {
    visible: boolean;
    message: string;
    onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ visible, message, onClose }) => {
    useEffect(() => {
        if (visible) {
            // If the modal becomes visible, we can show it
            setShow(true);
        }
    }, [visible]);

    const [show, setShow] = useState(visible);

    const handleClose = () => {
        setShow(false);
        onClose(); // Call the onClose prop to notify the parent
    };

    // When show changes, sync it with the visible prop
    useEffect(() => {
        setShow(visible);
    }, [visible]);

    return (
        <div>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Error</Modal.Title>
                </Modal.Header>
                <Modal.Body>{message}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ErrorModal;
