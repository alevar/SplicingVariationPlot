import React from 'react';

import hiv_atlas_logo from '../../assets/hiv_atlas.logo.crop.svg';
import './Spinner.css';

const Spinner: React.FC = () => {
  return (
    <div className="spinner">
      <img src={hiv_atlas_logo} style={{ height: '200px', marginRight: '15px' }} />
    </div>
  );
};

export default Spinner;
